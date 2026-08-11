import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { toFeedbackItem, WALL_QUERY } from "@/lib/feedback-format";
import { getSession } from "@/lib/session";
import { getAcceptedManagerId, hasEnoughSubmitters } from "@/lib/team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The wall shows a team its own feedback, so it scopes to the viewer's manager:
// a manager sees the team they receive feedback from, an employee sees the team
// they belong to.
export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") ?? "all";

  try {
    const pool = getPool();
    const managerId =
      session.role === "manager"
        ? session.userId
        : await getAcceptedManagerId(pool, session.userId);

    if (!managerId || !(await hasEnoughSubmitters(pool, managerId))) {
      return NextResponse.json({ items: [], suppressed: true });
    }

    const [rows] = await pool.query(WALL_QUERY, [
      managerId,
      categoryId,
      categoryId,
    ]);
    return NextResponse.json({
      items: rows.map(toFeedbackItem),
      suppressed: false,
    });
  } catch (error) {
    console.error("wall query failed", error);
    return NextResponse.json(
      { error: "Could not load the feedback wall" },
      { status: 500 },
    );
  }
}
