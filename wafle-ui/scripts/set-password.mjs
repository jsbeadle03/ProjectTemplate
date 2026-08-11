// Sets a strong random password on an existing account and prints it once.
// Usage: npm run set-password -- someone@wafle.local
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run set-password -- <email>");
  process.exit(1);
}

const password = randomBytes(12).toString("base64url");

const connection = await mysql.createConnection({
  host: process.env.WAFLE_DB_HOST,
  port: Number(process.env.WAFLE_DB_PORT) || 3306,
  user: process.env.WAFLE_DB_USER,
  password: process.env.WAFLE_DB_PASSWORD,
  database: process.env.WAFLE_DB_SCHEMA,
});

const [result] = await connection.query(
  "UPDATE users SET password_hash = ? WHERE email = ?",
  [await bcrypt.hash(password, 12), email],
);
await connection.end();

if (result.affectedRows === 0) {
  console.error(`No account found for ${email}`);
  process.exit(1);
}

console.log(`${email}\n${password}`);
