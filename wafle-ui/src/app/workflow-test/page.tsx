import Link from "next/link";
import type { PoolConnection } from "mysql2/promise";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { CSSProperties } from "react";
import { getPool } from "@/lib/db";
import { FEEDBACK_SELECT, MY_FEEDBACK_QUERY, toDetail } from "@/lib/feedback-format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Required response workflow test",
  description:
    "An end-to-end check of the required-response loop, from submission through manager response.",
};

const PENDING_CHECK_QUERY = `${FEEDBACK_SELECT}
   WHERE c.requires_response = 1
     AND NOT EXISTS (
       SELECT 1 FROM feedback_responses fr WHERE fr.feedback_id = f.id
     )`;

const BACKLOG_COUNT_QUERY = `
  SELECT COUNT(*) AS backlogCount
    FROM feedback f
    JOIN categories c ON f.category_id = c.id
   WHERE c.requires_response = 1
     AND NOT EXISTS (
       SELECT 1 FROM feedback_responses fr WHERE fr.feedback_id = f.id
     )`;

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

interface UserRow extends RowDataPacket {
  id: number;
  anonymousId: string;
}

interface FeedbackRow extends RowDataPacket {
  feedbackId: number;
  categoryId: number;
  categoryName: string;
  body: string;
  isRead: number;
  readAt: string | null;
  createdAt: string;
  requiresResponse: number;
  upCount: number;
  responseCount: number;
  response: string | null;
  actionType: string | null;
}

interface BacklogRow extends RowDataPacket {
  backlogCount: number;
}

type Check = { name: string; ok: boolean; detail: string };

type WorkflowResult = {
  ok: boolean;
  checks: Check[];
  backlogCount: number | null;
  message: string | null;
};

async function testRequiredResponseWorkflow(): Promise<WorkflowResult> {
  let connection: PoolConnection | null = null;
  const checks: Check[] = [];

  try {
    const pool = getPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Required categories behave correctly.
    const [categoryRows] = await connection.query<CategoryRow[]>(
      "SELECT id, name FROM categories WHERE requires_response = 1 LIMIT 1",
    );
    const category = categoryRows[0];
    checks.push({
      name: "Required categories behave correctly",
      ok: Boolean(category),
      detail: category
        ? `"${category.name}" requires a response.`
        : "No category is flagged as requiring a response.",
    });
    if (!category) {
      return {
        ok: false,
        checks,
        backlogCount: null,
        message: "No required-response category is configured.",
      };
    }

    const [employeeRows] = await connection.query<UserRow[]>(
      "SELECT id, anonymous_id AS anonymousId FROM users WHERE role = 'employee' LIMIT 1",
    );
    const employee = employeeRows[0];
    const [managerRows] = await connection.query<UserRow[]>(
      "SELECT id, anonymous_id AS anonymousId FROM users WHERE role = 'manager' LIMIT 1",
    );
    const manager = managerRows[0];
    if (!employee || !manager) {
      return {
        ok: false,
        checks,
        backlogCount: null,
        message: "Seed data is missing an employee or manager account.",
      };
    }

    // 2. Submission is tracked.
    const [insertResult] = await connection.query<ResultSetHeader>(
      "INSERT INTO feedback (anonymous_id, category_id, content) VALUES (?, ?, ?)",
      [employee.anonymousId, category.id, "Workflow test: submission tracking check."],
    );
    const feedbackId = insertResult.insertId;

    const [pendingBeforeRows] = await connection.query<FeedbackRow[]>(
      `${PENDING_CHECK_QUERY} AND f.id = ?`,
      [feedbackId],
    );
    checks.push({
      name: "Submission is tracked",
      ok: pendingBeforeRows.length === 1,
      detail:
        pendingBeforeRows.length === 1
          ? "The new submission appears in the pending-responses query."
          : "The new submission did not appear in the pending-responses query.",
    });

    // 3. Managers can submit responses.
    await connection.query(
      `INSERT INTO feedback_responses (feedback_id, responded_by, response_text, action_type)
       VALUES (?, ?, ?, ?)`,
      [feedbackId, manager.id, "Workflow test: response tracking check.", "Investigating"],
    );
    await connection.query(
      "UPDATE feedback SET is_read = 1, read_at = COALESCE(read_at, NOW()) WHERE id = ?",
      [feedbackId],
    );

    const [pendingAfterRows] = await connection.query<FeedbackRow[]>(
      `${PENDING_CHECK_QUERY} AND f.id = ?`,
      [feedbackId],
    );
    const [detailRows] = await connection.query<FeedbackRow[]>(
      `${FEEDBACK_SELECT} WHERE f.id = ?`,
      [feedbackId],
    );
    const detail = detailRows[0] ? toDetail(detailRows[0]) : null;
    const respondedCorrectly =
      pendingAfterRows.length === 0 && detail?.status === "Responded";
    checks.push({
      name: "Managers can submit responses",
      ok: respondedCorrectly,
      detail: respondedCorrectly
        ? "The item left the pending queue and now reports status \"Responded.\""
        : "The item did not leave the pending queue or its status is unexpected.",
    });

    // 4. Employees can view responses.
    const [myFeedbackRows] = await connection.query<FeedbackRow[]>(
      MY_FEEDBACK_QUERY,
      [employee.anonymousId],
    );
    const myFeedbackItem = myFeedbackRows
      .map(toDetail)
      .find((item) => item.feedbackId === feedbackId);
    const employeeCanView =
      Boolean(myFeedbackItem) &&
      myFeedbackItem?.response === "Workflow test: response tracking check." &&
      myFeedbackItem?.actionType === "Investigating";
    checks.push({
      name: "Employees can view responses",
      ok: employeeCanView,
      detail: employeeCanView
        ? "The employee's own-feedback query returns the response and action type."
        : "The employee's own-feedback query did not return the expected response.",
    });

    await connection.rollback();

    // 5. Nothing required is left untracked — checked against real, live data
    // (outside the rolled-back transaction) rather than the rows this test
    // just inserted and undid.
    const [pendingListRows] = (await pool.query(PENDING_CHECK_QUERY)) as [
      FeedbackRow[],
      unknown,
    ];
    const [backlogRows] = (await pool.query(BACKLOG_COUNT_QUERY)) as [
      BacklogRow[],
      unknown,
    ];
    const backlogCount = Number(backlogRows[0]?.backlogCount ?? 0);
    const backlogMatches = pendingListRows.length === backlogCount;
    checks.push({
      name: "Nothing required is left untracked",
      ok: backlogMatches,
      detail: backlogMatches
        ? `${backlogCount} required-response item(s) currently awaiting a reply.`
        : "The pending-responses list and the backlog count disagree.",
    });

    return {
      ok: checks.every((check) => check.ok),
      checks,
      backlogCount,
      message: null,
    };
  } catch (error: unknown) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }
    const workflowError = error as Error;
    return {
      ok: false,
      checks,
      backlogCount: null,
      message: workflowError.message || "The workflow test failed unexpectedly.",
    };
  } finally {
    connection?.release();
  }
}

export default async function WorkflowTestPage() {
  const result = await testRequiredResponseWorkflow();

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link className="brand" href="/" aria-label="Waflé home">
          <span className="brand-mark" aria-hidden="true" />
          <span>Waflé</span>
        </Link>
        <span style={styles.environment}>Server-side diagnostic</span>
      </header>

      <main style={styles.main}>
        <section style={styles.intro}>
          <span className="eyebrow">Issue #26 · Required response workflow</span>
          <h1 style={styles.title}>Does the loop actually close?</h1>
          <p style={styles.lede}>
            This page runs the required-response path end to end inside a
            transaction it always rolls back: submit feedback in a required
            category, post a manager response, confirm the employee can see
            it, then confirm nothing required is left untracked.
          </p>
        </section>

        <section
          aria-live="polite"
          style={{
            ...styles.card,
            borderColor: result.ok ? "#b8d7c0" : "#e5c2bd",
          }}
        >
          <div style={styles.statusHeading}>
            <span
              aria-hidden="true"
              style={{
                ...styles.statusDot,
                background: result.ok ? "#5e9e6e" : "#c1554e",
                boxShadow: result.ok
                  ? "0 0 0 7px rgba(94, 158, 110, 0.14)"
                  : "0 0 0 7px rgba(193, 85, 78, 0.12)",
              }}
            />
            <div>
              <span style={styles.label}>{result.ok ? "PASSED" : "FAILED"}</span>
              <h2 style={styles.statusTitle}>
                {result.ok
                  ? "Required response workflow test passed"
                  : "Required response workflow test failed"}
              </h2>
            </div>
          </div>

          <ul style={styles.checkList}>
            {result.checks.map((check) => (
              <li key={check.name} style={styles.checkRow}>
                <span
                  aria-hidden="true"
                  style={{
                    ...styles.checkDot,
                    background: check.ok ? "#5e9e6e" : "#c1554e",
                  }}
                />
                <div>
                  <strong style={styles.checkName}>{check.name}</strong>
                  <p style={styles.checkDetail}>{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          {result.backlogCount !== null ? (
            <div style={styles.detailItem}>
              <span style={styles.term}>Current backlog</span>
              <span style={styles.value}>
                {result.backlogCount} item(s) awaiting a required response
              </span>
            </div>
          ) : null}
          {result.message ? (
            <div style={styles.errorPanel}>
              <p style={styles.errorMessage}>{result.message}</p>
            </div>
          ) : null}

          <div style={styles.actions}>
            <a className="button button-primary" href="/workflow-test">
              Run test again
            </a>
            <Link className="text-link" href="/database-test">
              Database connectivity test →
            </Link>
          </div>
        </section>

        <p style={styles.securityNote}>
          Every check runs inside a transaction that is always rolled back, so
          this test never leaves rows behind in the live database.
        </p>
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    background:
      "radial-gradient(circle at 78% 8%, rgba(217, 160, 91, 0.2), transparent 28rem), #fffaf0",
    minHeight: "100vh",
  },
  header: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    margin: "0 auto",
    maxWidth: "1060px",
    padding: "1.35rem clamp(1.25rem, 4vw, 2.5rem)",
  },
  environment: {
    background: "rgba(59, 42, 32, 0.08)",
    borderRadius: "999px",
    color: "#5c493d",
    fontSize: "0.72rem",
    fontWeight: 750,
    padding: "0.55rem 0.8rem",
  },
  main: {
    margin: "0 auto",
    maxWidth: "880px",
    padding: "5rem clamp(1.25rem, 4vw, 2.5rem) 4rem",
  },
  intro: { marginBottom: "2rem", maxWidth: "720px" },
  title: {
    fontSize: "clamp(2.8rem, 7vw, 4.8rem)",
    fontWeight: 500,
    letterSpacing: "-0.06em",
    lineHeight: 1,
    marginBottom: "1.25rem",
  },
  lede: {
    color: "#5c493d",
    fontSize: "1.02rem",
    lineHeight: 1.75,
    marginBottom: 0,
  },
  card: {
    background: "rgba(255, 255, 255, 0.88)",
    border: "1px solid",
    borderRadius: "24px",
    boxShadow: "0 28px 70px rgba(59, 42, 32, 0.12)",
    padding: "clamp(1.5rem, 5vw, 2.6rem)",
  },
  statusHeading: {
    alignItems: "flex-start",
    display: "flex",
    gap: "1.2rem",
  },
  statusDot: {
    borderRadius: "50%",
    flex: "0 0 auto",
    height: "13px",
    margin: "0.55rem 0 0 0.25rem",
    width: "13px",
  },
  label: {
    color: "#8b5e34",
    display: "block",
    fontSize: "0.68rem",
    fontWeight: 850,
    letterSpacing: "0.12em",
    marginBottom: "0.45rem",
  },
  statusTitle: {
    fontSize: "clamp(1.45rem, 4vw, 2rem)",
    fontWeight: 500,
    letterSpacing: "-0.035em",
    margin: 0,
  },
  checkList: {
    display: "grid",
    gap: "0.6rem",
    listStyle: "none",
    margin: "2rem 0 0",
    padding: 0,
  },
  checkRow: {
    alignItems: "flex-start",
    background: "#f8f4ec",
    border: "1px solid #eadfce",
    borderRadius: "12px",
    display: "flex",
    gap: "0.8rem",
    padding: "0.85rem 1rem",
  },
  checkDot: {
    borderRadius: "50%",
    flex: "0 0 auto",
    height: "9px",
    margin: "0.3rem 0 0",
    width: "9px",
  },
  checkName: {
    color: "#3b2a20",
    display: "block",
    fontSize: "0.82rem",
  },
  checkDetail: {
    color: "#796b61",
    fontSize: "0.76rem",
    lineHeight: 1.55,
    margin: "0.25rem 0 0",
  },
  detailItem: {
    background: "#f8f4ec",
    border: "1px solid #eadfce",
    borderRadius: "12px",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    justifyContent: "space-between",
    margin: "1.5rem 0 0",
    padding: "1rem",
  },
  term: {
    color: "#796b61",
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  value: {
    color: "#3b2a20",
    fontSize: "0.83rem",
    fontWeight: 750,
  },
  errorPanel: {
    background: "rgba(193, 85, 78, 0.08)",
    borderRadius: "14px",
    marginTop: "1.5rem",
    padding: "1rem 1.1rem",
  },
  errorMessage: { color: "#6d3d38", lineHeight: 1.6, margin: 0 },
  actions: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "1.3rem",
    marginTop: "2rem",
  },
  securityNote: {
    color: "#796b61",
    fontSize: "0.76rem",
    lineHeight: 1.6,
    margin: "1.4rem auto 0",
    maxWidth: "650px",
    textAlign: "center",
  },
};
