import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import mysql from "mysql2/promise";
import {
  DETAIL_QUERY,
  LIST_QUERY,
  MY_FEEDBACK_QUERY,
  toFeedbackItem,
  WALL_QUERY,
} from "../src/lib/feedback-format.js";
import { hasEnoughSubmitters, MIN_SUBMITTERS } from "../src/lib/team.js";

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

async function makeManager(db, displayName = "Test Manager") {
  const anonymousId = randomUUID();
  const [result] = await db.query(
    `INSERT INTO users (email, password_hash, role, anonymous_id, display_name)
     VALUES (?, 'test-hash', 'manager', ?, ?)`,
    [`mgr.${anonymousId}@wafle.test`, anonymousId, displayName],
  );
  return { id: result.insertId, anonymousId };
}

async function makeEmployee(db, managerId, linkStatus = "accepted") {
  const anonymousId = randomUUID();
  const [result] = await db.query(
    `INSERT INTO users (email, password_hash, role, anonymous_id, display_name, manager_id, link_status)
     VALUES (?, 'test-hash', 'employee', ?, 'Test Employee', ?, ?)`,
    [`emp.${anonymousId}@wafle.test`, anonymousId, managerId, linkStatus],
  );
  return { id: result.insertId, anonymousId };
}

async function submit(db, employee, managerId, categoryId, content) {
  const [result] = await db.query(
    `INSERT INTO feedback (anonymous_id, category_id, content, manager_id)
     VALUES (?, ?, ?, ?)`,
    [employee.anonymousId, categoryId, content, managerId],
  );
  return result.insertId;
}

async function anyCategory(db, requiresResponse = false) {
  const [[row]] = await db.query(
    `SELECT id FROM categories WHERE requires_response = ? LIMIT 1`,
    [requiresResponse ? 1 : 0],
  );
  return row.id;
}

// Enough submitters that the anonymity threshold is satisfied, so a test can
// exercise the queries rather than the suppression.
async function makeOpenTeam(db) {
  const manager = await makeManager(db);
  const categoryId = await anyCategory(db);
  const employees = [];
  for (let index = 0; index < MIN_SUBMITTERS; index += 1) {
    const employee = await makeEmployee(db, manager.id);
    await submit(db, employee, manager.id, categoryId, `Filler item ${index}.`);
    employees.push(employee);
  }
  return { manager, categoryId, employees };
}

describe(
  "manager scoping and the anonymity threshold",
  { skip: configured ? false : "WAFLE_DB_* not configured" },
  () => {
    it("never shows one manager another manager's feedback", async () => {
      await withRollback(async (db) => {
        const a = await makeOpenTeam(db);
        const b = await makeOpenTeam(db);

        const secret = await submit(
          db,
          b.employees[0],
          b.manager.id,
          b.categoryId,
          "Only manager B should ever see this.",
        );

        const [inbox] = await db.query(LIST_QUERY, [
          a.manager.id,
          "all",
          "all",
          "",
          "",
        ]);
        assert.equal(
          inbox.some((row) => row.feedbackId === secret),
          false,
          "manager A's inbox must not contain manager B's feedback",
        );

        const [wall] = await db.query(WALL_QUERY, [a.manager.id, "all", "all"]);
        assert.equal(
          wall.some((row) => row.feedbackId === secret),
          false,
          "manager A's wall must not contain manager B's feedback",
        );

        // The direct-by-id path is the one a curious manager would actually try.
        const [detail] = await db.query(DETAIL_QUERY, [secret, a.manager.id]);
        assert.equal(detail.length, 0, "fetching by id must respect scoping");

        const [ownDetail] = await db.query(DETAIL_QUERY, [
          secret,
          b.manager.id,
        ]);
        assert.equal(ownDetail.length, 1, "the owning manager still sees it");
      });
    });

    it("hides feedback until enough of a team has submitted", async () => {
      await withRollback(async (db) => {
        const manager = await makeManager(db);
        const categoryId = await anyCategory(db);

        for (let count = 1; count < MIN_SUBMITTERS; count += 1) {
          const employee = await makeEmployee(db, manager.id);
          await submit(db, employee, manager.id, categoryId, `Item ${count}.`);
          assert.equal(
            await hasEnoughSubmitters(db, manager.id),
            false,
            `${count} submitter(s) should still be suppressed`,
          );
        }

        const last = await makeEmployee(db, manager.id);
        await submit(
          db,
          last,
          manager.id,
          categoryId,
          "The one that opens it.",
        );
        assert.equal(await hasEnoughSubmitters(db, manager.id), true);
      });
    });

    it("counts submitters, not submissions", async () => {
      await withRollback(async (db) => {
        const manager = await makeManager(db);
        const categoryId = await anyCategory(db);
        const employee = await makeEmployee(db, manager.id);

        for (let index = 0; index < MIN_SUBMITTERS + 2; index += 1) {
          await submit(db, employee, manager.id, categoryId, `Item ${index}.`);
        }

        assert.equal(
          await hasEnoughSubmitters(db, manager.id),
          false,
          "one person submitting repeatedly must not unlock the inbox",
        );
      });
    });

    it("only accepts a request that points at the accepting manager", async () => {
      await withRollback(async (db) => {
        const mine = await makeManager(db);
        const theirs = await makeManager(db);
        const employee = await makeEmployee(db, theirs.id, "pending");

        const [wrong] = await db.query(
          `UPDATE users SET link_status = 'accepted'
            WHERE id = ? AND manager_id = ? AND link_status = 'pending'`,
          [employee.id, mine.id],
        );
        assert.equal(wrong.affectedRows, 0, "must not accept another's report");

        const [right] = await db.query(
          `UPDATE users SET link_status = 'accepted'
            WHERE id = ? AND manager_id = ? AND link_status = 'pending'`,
          [employee.id, theirs.id],
        );
        assert.equal(right.affectedRows, 1);
      });
    });

    it("never exposes an anonymous id through the team list", async () => {
      await withRollback(async (db) => {
        const manager = await makeManager(db);
        await makeEmployee(db, manager.id, "pending");

        const [rows] = await db.query(
          `SELECT id, display_name AS displayName, link_status AS linkStatus
             FROM users WHERE manager_id = ? AND link_status IS NOT NULL`,
          [manager.id],
        );

        assert.ok(rows.length > 0);
        for (const row of rows) {
          assert.equal(row.anonymous_id, undefined);
          assert.equal(row.anonymousId, undefined);
        }
      });
    });
  },
);

describe(
  "required-response workflow",
  { skip: configured ? false : "WAFLE_DB_* not configured" },
  () => {
    it("carries feedback from submission to a response the employee can see", async () => {
      await withRollback(async (db) => {
        const { manager, employees } = await makeOpenTeam(db);
        const categoryId = await anyCategory(db, true);
        const employee = employees[0];

        const feedbackId = await submit(
          db,
          employee,
          manager.id,
          categoryId,
          "Workflow test submission.",
        );

        const pending = `SELECT f.id FROM feedback f
             JOIN categories c ON c.id = f.category_id
            WHERE c.requires_response = 1 AND f.id = ? AND f.manager_id = ?
              AND NOT EXISTS (SELECT 1 FROM feedback_responses fr WHERE fr.feedback_id = f.id)`;

        const [before] = await db.query(pending, [feedbackId, manager.id]);
        assert.equal(before.length, 1, "should await a response");

        await db.query(
          `INSERT INTO feedback_responses (feedback_id, responded_by, response_text, action_type)
           VALUES (?, ?, ?, ?)`,
          [feedbackId, manager.id, "Workflow test response.", "Investigating"],
        );
        await db.query(
          "UPDATE feedback SET is_read = 1, read_at = COALESCE(read_at, NOW()) WHERE id = ? AND manager_id = ?",
          [feedbackId, manager.id],
        );

        const [after] = await db.query(pending, [feedbackId, manager.id]);
        assert.equal(after.length, 0, "should leave the pending queue");

        const [mine] = await db.query(MY_FEEDBACK_QUERY, [
          employee.anonymousId,
        ]);
        const item = mine
          .map(toFeedbackItem)
          .find((row) => row.feedbackId === feedbackId);
        assert.equal(item.status, "Responded");
        assert.equal(item.actionType, "Investigating");
        assert.equal(item.response, "Workflow test response.");
      });
    });

    it("only returns an employee their own feedback", async () => {
      await withRollback(async (db) => {
        const { manager, categoryId, employees } = await makeOpenTeam(db);
        const [first, second] = employees;
        await submit(db, second, manager.id, categoryId, "Second person only.");

        const [mine] = await db.query(MY_FEEDBACK_QUERY, [first.anonymousId]);
        const [theirs] = await db.query(MY_FEEDBACK_QUERY, [
          second.anonymousId,
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
        const { manager } = await makeOpenTeam(db);
        const [rows] = await db.query(LIST_QUERY, [
          manager.id,
          "all",
          "all",
          "",
          "",
        ]);

        assert.ok(rows.length > 0);
        for (const row of rows) {
          assert.equal(row.anonymous_id, undefined);
          assert.equal(row.anonymousId, undefined);
        }
      });
    });

    it("keeps a keyword with a LIKE wildcard literal", async () => {
      await withRollback(async (db) => {
        const { manager, categoryId, employees } = await makeOpenTeam(db);
        await submit(
          db,
          employees[0],
          manager.id,
          categoryId,
          "Utilisation hit 100% last week.",
        );

        const [matches] = await db.query(LIST_QUERY, [
          manager.id,
          "all",
          "all",
          "100!%",
          "100!%",
        ]);
        assert.ok(matches.some((row) => row.body.includes("100%")));

        // Unescaped, "%" would match everything; escaped it matches nothing.
        const [noMatches] = await db.query(LIST_QUERY, [
          manager.id,
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
        const { manager, categoryId, employees } = await makeOpenTeam(db);
        const feedbackId = await submit(
          db,
          employees[0],
          manager.id,
          categoryId,
          "Reaction counting check.",
        );

        await db.query(
          `INSERT INTO feedback_reactions (feedback_id, anonymous_id, reaction)
           VALUES (?, ?, 'like'), (?, ?, 'dislike')`,
          [
            feedbackId,
            employees[0].anonymousId,
            feedbackId,
            employees[1].anonymousId,
          ],
        );

        const [rows] = await db.query(WALL_QUERY, [manager.id, "all", "all"]);
        const item = rows
          .map(toFeedbackItem)
          .find((row) => row.feedbackId === feedbackId);
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
