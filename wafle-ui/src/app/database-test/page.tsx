import Link from "next/link";
import { createConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import type { CSSProperties } from "react";
import { getDbConfig } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Database connectivity test",
  description: "A server-side connectivity check for the Waflé MySQL database.",
};

const database = getDbConfig();

// Every table the app queries against. If one is missing, the schema isn't
// fully provisioned even though the connection itself succeeds.
const REQUIRED_TABLES = [
  "categories",
  "feedback",
  "feedback_reactions",
  "feedback_responses",
  "mood_checkins",
  "users",
] as const;

interface ProbeRow extends RowDataPacket {
  selectedSchema: string | null;
  authenticatedAccount: string;
  probe: number;
}

interface TableCountRow extends RowDataPacket {
  tableName: string;
  rowCount: number;
}

type TableStatus = { name: string; present: boolean; rowCount: number | null };

type ConnectionResult =
  | {
      ok: true;
      selectedSchema: string;
      authenticatedAccount: string;
      durationMs: number;
      tables: TableStatus[];
    }
  | {
      ok: false;
      message: string;
      code?: string;
    };

async function testDatabaseConnection(): Promise<ConnectionResult> {
  const password = database.password;

  if (!password || !database.host || !database.user || !database.schema) {
    return {
      ok: false,
      code: "CONFIGURATION_REQUIRED",
      message:
        "Set WAFLE_DB_HOST, WAFLE_DB_SCHEMA, WAFLE_DB_USER, and WAFLE_DB_PASSWORD in wafle-ui/.env.local, then restart the development server.",
    };
  }

  if (!Number.isInteger(database.port) || database.port < 1) {
    return {
      ok: false,
      code: "INVALID_PORT",
      message: "WAFLE_DB_PORT must be a valid TCP port.",
    };
  }

  const startedAt = Date.now();

  try {
    const connection = await createConnection({
      host: database.host,
      port: database.port,
      database: database.schema,
      user: database.user,
      password,
      connectTimeout: 10_000,
    });

    try {
      const [rows] = await connection.query<ProbeRow[]>(
        `SELECT
          DATABASE() AS selectedSchema,
          CURRENT_USER() AS authenticatedAccount,
          1 AS probe`,
      );
      const row = rows[0];

      if (!row || row.probe !== 1) {
        throw new Error("The read-only probe did not return the expected value.");
      }

      if (row.selectedSchema !== database.schema) {
        throw new Error(
          `Connected successfully, but MySQL selected ${row.selectedSchema ?? "no schema"} instead of ${database.schema}.`,
        );
      }

      const [tableRows] = await connection.query<TableCountRow[]>(
        `SELECT TABLE_NAME AS tableName, TABLE_ROWS AS rowCount
           FROM information_schema.tables
          WHERE table_schema = ?`,
        [database.schema],
      );
      const presentTables = new Map(
        tableRows.map((tableRow) => [tableRow.tableName, tableRow.rowCount]),
      );

      const tables: TableStatus[] = REQUIRED_TABLES.map((name) => ({
        name,
        present: presentTables.has(name),
        rowCount: presentTables.has(name) ? Number(presentTables.get(name)) : null,
      }));

      return {
        ok: true,
        selectedSchema: row.selectedSchema,
        authenticatedAccount: row.authenticatedAccount,
        durationMs: Date.now() - startedAt,
        tables,
      };
    } finally {
      await connection.end();
    }
  } catch (error: unknown) {
    const databaseError = error as Error & { code?: string };

    return {
      ok: false,
      code: databaseError.code,
      message: databaseError.message || "The database connection failed.",
    };
  }
}

export default async function DatabaseTestPage() {
  const result = await testDatabaseConnection();

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
          <span className="eyebrow">Issue #16 · Database connectivity</span>
          <h1 style={styles.title}>Can Waflé reach MySQL?</h1>
          <p style={styles.lede}>
            This page opens a server-side connection, confirms the configured
            schema, runs a read-only <code>SELECT 1</code> probe, and checks that
            every table the app depends on is present. No database credentials
            are sent to the browser.
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
              <span style={styles.label}>
                {result.ok ? "CONNECTED" : "NOT CONNECTED"}
              </span>
              <h2 style={styles.statusTitle}>
                {result.ok
                  ? "Database connectivity test passed"
                  : "Database connectivity test failed"}
              </h2>
            </div>
          </div>

          {result.ok === true ? (
            <dl style={styles.details}>
              <div style={styles.detailItem}>
                <dt style={styles.term}>Endpoint</dt>
                <dd style={styles.value}>
                  {database.host}:{database.port}
                </dd>
              </div>
              <div style={styles.detailItem}>
                <dt style={styles.term}>Selected schema</dt>
                <dd style={styles.value}>{result.selectedSchema}</dd>
              </div>
              <div style={styles.detailItem}>
                <dt style={styles.term}>Authenticated account</dt>
                <dd style={styles.value}>{result.authenticatedAccount}</dd>
              </div>
              <div style={styles.detailItem}>
                <dt style={styles.term}>Read-only probe</dt>
                <dd style={styles.value}>Passed in {result.durationMs} ms</dd>
              </div>
            </dl>
          ) : null}

          {result.ok === true ? (
            <div style={styles.tableSection}>
              <span style={styles.label}>Schema tables</span>
              <ul style={styles.tableList}>
                {result.tables.map((table) => (
                  <li key={table.name} style={styles.tableRow}>
                    <span
                      aria-hidden="true"
                      style={{
                        ...styles.tableDot,
                        background: table.present ? "#5e9e6e" : "#c1554e",
                      }}
                    />
                    <code style={styles.tableName}>{table.name}</code>
                    <span style={styles.tableCount}>
                      {table.present
                        ? `${table.rowCount ?? 0} rows`
                        : "missing"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div style={styles.errorPanel}>
              {result.code && <strong style={styles.errorCode}>{result.code}</strong>}
              <p style={styles.errorMessage}>{result.message}</p>
            </div>
          )}

          <div style={styles.actions}>
            <a className="button button-primary" href="/database-test">
              Run test again
            </a>
            <Link className="text-link" href="/">
              Return to Waflé
            </Link>
          </div>
        </section>

        <p style={styles.securityNote}>
          The password is read only by the Next.js server from{" "}
          <code>WAFLE_DB_PASSWORD</code> and is never rendered into this page.
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
  details: {
    display: "grid",
    gap: "1px",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    margin: "2rem 0 0",
    overflow: "hidden",
  },
  detailItem: {
    background: "#f8f4ec",
    border: "1px solid #eadfce",
    margin: 0,
    padding: "1rem",
  },
  term: {
    color: "#796b61",
    fontSize: "0.67rem",
    fontWeight: 800,
    letterSpacing: "0.08em",
    marginBottom: "0.45rem",
    textTransform: "uppercase",
  },
  value: {
    color: "#3b2a20",
    fontSize: "0.83rem",
    fontWeight: 750,
    margin: 0,
    overflowWrap: "anywhere",
  },
  errorPanel: {
    background: "rgba(193, 85, 78, 0.08)",
    borderRadius: "14px",
    marginTop: "2rem",
    padding: "1rem 1.1rem",
  },
  errorCode: {
    color: "#963f39",
    display: "block",
    fontSize: "0.7rem",
    letterSpacing: "0.08em",
    marginBottom: "0.4rem",
  },
  errorMessage: { color: "#6d3d38", lineHeight: 1.6, margin: 0 },
  tableSection: { marginTop: "2rem" },
  tableList: {
    display: "grid",
    gap: "0.5rem",
    listStyle: "none",
    margin: "0.6rem 0 0",
    padding: 0,
  },
  tableRow: {
    alignItems: "center",
    background: "#f8f4ec",
    border: "1px solid #eadfce",
    borderRadius: "10px",
    display: "flex",
    gap: "0.7rem",
    padding: "0.6rem 0.85rem",
  },
  tableDot: {
    borderRadius: "50%",
    flex: "0 0 auto",
    height: "8px",
    width: "8px",
  },
  tableName: {
    color: "#3b2a20",
    flex: "1 1 auto",
    fontSize: "0.8rem",
    fontWeight: 700,
  },
  tableCount: {
    color: "#796b61",
    fontSize: "0.72rem",
    fontWeight: 700,
  },
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
