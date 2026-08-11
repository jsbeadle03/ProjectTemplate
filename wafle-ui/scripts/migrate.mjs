// Applies every .sql file in db/migrations in name order. Each statement uses
// IF NOT EXISTS or a guarded UPDATE, so re-running is safe.
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const migrations = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");

const connection = await mysql.createConnection({
  host: process.env.WAFLE_DB_HOST,
  port: Number(process.env.WAFLE_DB_PORT) || 3306,
  user: process.env.WAFLE_DB_USER,
  password: process.env.WAFLE_DB_PASSWORD,
  database: process.env.WAFLE_DB_SCHEMA,
  multipleStatements: true,
});

for (const file of (await readdir(migrations)).filter((n) => n.endsWith(".sql")).sort()) {
  await connection.query(await readFile(join(migrations, file), "utf8"));
  console.log(`applied ${file}`);
}

await connection.end();
