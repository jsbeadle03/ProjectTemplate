import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import mysql from "mysql2/promise";
import {
  LIST_QUERY,
  MY_FEEDBACK_QUERY,
  toFeedbackItem,
  WALL_QUERY,
} from "../src/lib/feedback-format.js";

const configured = Boolean(process.env.WAFLE_DB_HOST);

const pool = configured
  ? mysql.createPool({
      host: process.env.WAFLE_DB_HOST,
      port: Number(process.env.WAFLE_DB_PORT) || 3306,
      user: process.env.WAFLE_DB_USER,
      password: process.env.WAFLE_DB_PASSWORD,
      database: process.env.WAFLE_DB_SCHEMA,
      connectionLimit: 2,
    })
  : null;

after(async () => {
  await pool?.end();
});

// Every test runs inside a transaction that is always rolled back, so the
// suite never leaves rows behind in the shared team database.
async function withRollback(run) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await run(connection);
  } finally {
    await connection.rollback().catch(() => {});
    connection.release();
  }
}

describe(
  "required-response workflow",
  { skip: configured ? false : "WAFLE_DB_* not configured" },
  () => {
    it("carries feedback from submission to a response the employee can see", async () => {
      await withRollback(async (db) => {
        const [[category]] = await db.query(
          "SELECT id, name FROM categories WHERE requires_response = 1 LIMIT 1",
        );
        const [[employee]] = await db.query(
          "SELECT anonymous_id AS anonymousId FROM users WHERE role = 'employee' LIMIT 1",
        );
        const [[manager]] = await db.query(
          "SELECT id FROM users WHERE role = 'manager' LIMIT 1",
        );
        assert.ok(category, "a required-response category must exist");
        assert.ok(employee && manager, "seed accounts must exist");

        const [inserted] = await db.query(
          "INSERT INTO feedback (anonymous_id, category_id, content) VALUES (?, ?, ?)",
          [employee.anonymousId, category.id, "Workflow test submission."],
        );
        const feedbackId = inserted.insertId;

        const [pendingBefore] = await db.query(
          `SELECT f.id FROM feedback f
             JOIN categories c ON c.id = f.category_id
            WHERE c.requires_response = 1 AND f.id = ?
              AND NOT EXISTS (SELECT 1 FROM feedback_responses fr WHERE fr.feedback_id = f.id)`,
          [feedbackId],
        );
        assert.equal(pendingBefore.length, 1, "should await a response");

        await db.query(
          `INSERT INTO feedback_responses (feedback_id, responded_by, response_text, action_type)
           VALUES (?, ?, ?, ?)`,
          [feedbackId, manager.id, "Workflow test response.", "Investigating"],
        );
        await db.query(
          "UPDATE feedback SET is_read = 1, read_at = COALESCE(read_at, NOW()) WHERE id = ?",
          [feedbackId],
        );

        const [pendingAfter] = await db.query(
          `SELECT f.id FROM feedback f
             JOIN categories c ON c.id = f.category_id
            WHERE c.requires_response = 1 AND f.id = ?
              AND NOT EXISTS (SELECT 1 FROM feedback_responses fr WHERE fr.feedback_id = f.id)`,
          [feedbackId],
        );
        assert.equal(pendingAfter.length, 0, "should leave the pending queue");

        const [mine] = await db.query(MY_FEEDBACK_QUERY, [
          employee.anonymousId,
        ]);
        const item = mine
          .map(toFeedbackItem)
          .find((r) => r.feedbackId === feedbackId);
        assert.equal(item.status, "Responded");
        assert.equal(item.actionType, "Investigating");
        assert.equal(item.response, "Workflow test response.");
      });
    });

    it("only returns an employee their own feedback", async () => {
      await withRollback(async (db) => {
        const [employees] = await db.query(
          "SELECT anonymous_id AS anonymousId FROM users WHERE role = 'employee'",
        );
        assert.ok(
          employees.length >= 2,
          "needs two employees to be meaningful",
        );

        const [mine] = await db.query(MY_FEEDBACK_QUERY, [
          employees[0].anonymousId,
        ]);
        const [theirs] = await db.query(MY_FEEDBACK_QUERY, [
          employees[1].anonymousId,
        ]);
        const mineIds = new Set(mine.map((row) => row.feedbackId));
        for (const row of theirs) {
          assert.equal(
            mineIds.has(row.feedbackId),
            false,
            "one employee must never see another's feedback",
          );
        }
      });
    });

    it("never selects the submitter into a manager-facing row", async () => {
      await withRollback(async (db) => {
        const [rows] = await db.query(LIST_QUERY, ["all", "all", "", ""]);
        for (const row of rows) {
          assert.equal(row.anonymous_id, undefined);
          assert.equal(row.anonymousId, undefined);
        }
      });
    });

    it("keeps a keyword with a LIKE wildcard literal", async () => {
      await withRollback(async (db) => {
        const [[category]] = await db.query(
          "SELECT id FROM categories LIMIT 1",
        );
        const [[employee]] = await db.query(
          "SELECT anonymous_id AS anonymousId FROM users WHERE role = 'employee' LIMIT 1",
        );
        await db.query(
          "INSERT INTO feedback (anonymous_id, category_id, content) VALUES (?, ?, ?)",
          [
            employee.anonymousId,
            category.id,
            "Utilisation hit 100% last week.",
          ],
        );

        const [matches] = await db.query(LIST_QUERY, [
          "all",
          "all",
          "100!%",
          "100!%",
        ]);
        assert.ok(matches.some((row) => row.body.includes("100%")));

        // Unescaped, "%" would match everything; escaped it matches nothing.
        const [noMatches] = await db.query(LIST_QUERY, [
          "all",
          "all",
          "zzz!%zzz",
          "zzz!%zzz",
        ]);
        assert.equal(noMatches.length, 0);
      });
    });

    it("counts reactions separately for likes and dislikes", async () => {
      await withRollback(async (db) => {
        const [[category]] = await db.query(
          "SELECT id FROM categories LIMIT 1",
        );
        const [users] = await db.query(
          "SELECT anonymous_id AS anonymousId FROM users LIMIT 2",
        );
        const [inserted] = await db.query(
          "INSERT INTO feedback (anonymous_id, category_id, content) VALUES (?, ?, ?)",
          [users[0].anonymousId, category.id, "Reaction counting check."],
        );

        await db.query(
          "INSERT INTO feedback_reactions (feedback_id, anonymous_id, reaction) VALUES (?, ?, 'like'), (?, ?, 'dislike')",
          [
            inserted.insertId,
            users[0].anonymousId,
            inserted.insertId,
            users[1].anonymousId,
          ],
        );

        const [rows] = await db.query(WALL_QUERY, ["all", "all"]);
        const item = rows
          .map(toFeedbackItem)
          .find((row) => row.feedbackId === inserted.insertId);
        assert.equal(item.upCount, 1);
        assert.equal(item.downCount, 1);
      });
    });

    it("refuses to orphan feedback by deleting its category", async () => {
      await withRollback(async (db) => {
        const [[used]] = await db.query(
          "SELECT category_id AS categoryId FROM feedback LIMIT 1",
        );
        await assert.rejects(
          () =>
            db.query("DELETE FROM categories WHERE id = ?", [used.categoryId]),
          /foreign key|constraint/i,
        );
      });
    });
  },
);
