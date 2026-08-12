// Wipes every account and everything anyone has shared, then recreates the
// team roster with generated passwords printed once.
//
// Categories are left alone: they are configuration, not data.
//
// Usage: npm run seed-roster -- --confirm
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

if (!process.argv.includes("--confirm")) {
  console.error(
    "This deletes every user, all feedback, responses, reactions, and check-ins.\n" +
      "Re-run with --confirm if that is what you want.",
  );
  process.exit(1);
}

const ROSTER = [
  {
    displayName: "Christian Montoya",
    email: "cmontoy8@asu.edu",
    role: "employee",
  },
  {
    displayName: "Jonathan Priest",
    email: "jtpriest@asu.edu",
    role: "employee",
  },
  { displayName: "Jordan Beadle", email: "jsbeadle@asu.edu", role: "employee" },
  {
    displayName: "Nahar Alsayedd",
    email: "nalsaye1@asu.edu",
    role: "employee",
  },
  { displayName: "Leo Smith", email: "lnsmit17@asu.edu", role: "manager" },
];

const connection = await mysql.createConnection({
  host: process.env.WAFLE_DB_HOST,
  port: Number(process.env.WAFLE_DB_PORT) || 3306,
  user: process.env.WAFLE_DB_USER,
  password: process.env.WAFLE_DB_PASSWORD,
  database: process.env.WAFLE_DB_SCHEMA,
});

await connection.beginTransaction();

try {
  // Ordered so no delete trips a foreign key.
  for (const table of [
    "feedback_responses",
    "feedback_reactions",
    "mood_checkins",
    "feedback",
  ]) {
    await connection.query(`DELETE FROM ${table}`);
  }
  await connection.query(
    "UPDATE users SET manager_id = NULL, link_status = NULL",
  );
  await connection.query("DELETE FROM users");

  const created = [];
  for (const person of ROSTER) {
    const password = randomBytes(9).toString("base64url");
    const [result] = await connection.query(
      `INSERT INTO users (email, password_hash, role, anonymous_id, display_name)
       VALUES (?, ?, ?, ?, ?)`,
      [
        person.email,
        await bcrypt.hash(password, 12),
        person.role,
        randomUUID(),
        person.displayName,
      ],
    );
    created.push({ ...person, id: result.insertId, password });
  }

  const manager = created.find((person) => person.role === "manager");
  await connection.query(
    "UPDATE users SET manager_id = ?, link_status = 'accepted' WHERE role = 'employee'",
    [manager.id],
  );

  await connection.commit();

  console.log("Roster created. Passwords are shown once:\n");
  for (const person of created) {
    console.log(
      `${person.displayName.padEnd(20)} ${person.email.padEnd(22)} ${person.role.padEnd(9)} ${person.password}`,
    );
  }
  console.log(
    `\nAll employees report to ${manager.displayName}, already accepted.`,
  );
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
