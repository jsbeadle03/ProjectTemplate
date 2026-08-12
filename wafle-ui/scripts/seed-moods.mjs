// Fills in daily mood check-ins for every accepted employee over the past
// month, so the dashboard has a trend to draw.
//
// Only fills days that have no check-in yet, so real check-ins people made
// themselves are never overwritten, and re-running cannot stack two entries
// on one day.
//
// Usage: npm run seed-moods [days]
import mysql from "mysql2/promise";

const DAYS = Number(process.argv[2]) || 30;
// Most days are fine, some are middling, bad days are rarer. A uniform 1-5
// would average out to a flat, obviously fake line.
const MOOD_WEIGHTS = [1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5];
const CHECK_IN_CHANCE = 0.75;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const connection = await mysql.createConnection({
  host: process.env.WAFLE_DB_HOST,
  port: Number(process.env.WAFLE_DB_PORT) || 3306,
  user: process.env.WAFLE_DB_USER,
  password: process.env.WAFLE_DB_PASSWORD,
  database: process.env.WAFLE_DB_SCHEMA,
});

const [employees] = await connection.query(
  `SELECT anonymous_id AS anonymousId, manager_id AS managerId, display_name AS displayName
     FROM users
    WHERE role = 'employee' AND link_status = 'accepted'`,
);

if (employees.length === 0) {
  console.error("No accepted employees to generate check-ins for.");
  process.exit(1);
}

const [existing] = await connection.query(
  `SELECT anonymous_id AS anonymousId, DATE(created_at) AS day
     FROM mood_checkins
    WHERE created_at >= NOW() - INTERVAL ? DAY`,
  [DAYS],
);
const taken = new Set(
  existing.map(
    (row) => `${row.anonymousId}|${new Date(row.day).toDateString()}`,
  ),
);

await connection.beginTransaction();

try {
  const rows = [];
  for (const employee of employees) {
    // A small per-person lean, so the team is not one indistinguishable blur.
    const lean = pick([-1, 0, 0, 0, 1]);

    for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
      if (Math.random() > CHECK_IN_CHANCE) {
        continue;
      }

      const day = new Date();
      day.setDate(day.getDate() - daysAgo);
      if (taken.has(`${employee.anonymousId}|${day.toDateString()}`)) {
        continue;
      }
      day.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

      const rating = Math.min(5, Math.max(1, pick(MOOD_WEIGHTS) + lean));
      rows.push([employee.anonymousId, rating, employee.managerId, day]);
    }
  }

  if (rows.length > 0) {
    await connection.query(
      "INSERT INTO mood_checkins (anonymous_id, mood_rating, manager_id, created_at) VALUES ?",
      [rows],
    );
  }

  await connection.commit();
  console.log(
    `Added ${rows.length} check-ins across ${DAYS} days for ${employees.length} employees. ` +
      `${existing.length} already existed and were left alone.`,
  );
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
