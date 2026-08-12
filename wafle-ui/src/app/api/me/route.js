import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  getSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deletes everything this person wrote and unlinks everything about them.
// Feedback other people sent to them is detached rather than deleted: it is not
// theirs to erase, even though nobody will be able to act on it afterwards.
export async function DELETE(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  const { userId, anonymousId } = session;
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      "UPDATE users SET manager_id = NULL, link_status = NULL WHERE manager_id = ?",
      [userId],
    );
    await connection.query(
      "UPDATE feedback SET manager_id = NULL WHERE manager_id = ?",
      [userId],
    );
    await connection.query(
      "UPDATE mood_checkins SET manager_id = NULL WHERE manager_id = ?",
      [userId],
    );

    await connection.query(
      "DELETE FROM feedback_responses WHERE responded_by = ?",
      [userId],
    );
    await connection.query(
      `DELETE FROM feedback_responses
        WHERE feedback_id IN (SELECT id FROM (SELECT id FROM feedback WHERE anonymous_id = ?) AS own)`,
      [anonymousId],
    );
    await connection.query(
      `DELETE FROM feedback_reactions
        WHERE anonymous_id = ?
           OR feedback_id IN (SELECT id FROM (SELECT id FROM feedback WHERE anonymous_id = ?) AS own)`,
      [anonymousId, anonymousId],
    );
    await connection.query("DELETE FROM mood_checkins WHERE anonymous_id = ?", [
      anonymousId,
    ]);
    await connection.query("DELETE FROM feedback WHERE anonymous_id = ?", [
      anonymousId,
    ]);
    await connection.query("DELETE FROM users WHERE id = ?", [userId]);

    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => {});
    console.error("account deletion failed", error);
    return NextResponse.json(
      { error: "Could not delete your account" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }

  const response = NextResponse.json({ deleted: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  return response;
}
