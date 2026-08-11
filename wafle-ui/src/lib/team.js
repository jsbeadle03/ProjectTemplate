export const ROLES = ["employee", "manager"];

// A manager sees no individual feedback until this many of their reports have
// submitted. Below it, scoping to a small team would tell the manager exactly
// who wrote what.
export const MIN_SUBMITTERS = 3;

// Read from the database rather than the session cookie: a manager accepting
// someone must take effect immediately, not when their session next renews.
export async function getLink(pool, userId) {
  const [rows] = await pool.query(
    "SELECT manager_id AS managerId, link_status AS linkStatus FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] ?? null;
}

export async function getAcceptedManagerId(pool, userId) {
  const link = await getLink(pool, userId);
  return link?.linkStatus === "accepted" ? link.managerId : null;
}

// Counted on the feedback table alone, so this never joins users and cannot
// surface who submitted what.
export async function hasEnoughSubmitters(pool, managerId) {
  const [[{ submitters }]] = await pool.query(
    "SELECT COUNT(DISTINCT anonymous_id) AS submitters FROM feedback WHERE manager_id = ?",
    [managerId],
  );
  return Number(submitters) >= MIN_SUBMITTERS;
}
