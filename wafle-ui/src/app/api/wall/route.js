import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { toFeedbackItem, WALL_QUERY } from "@/lib/feedback-format";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!(await getSession(request))) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") ?? "all";

  try {
    const pool = getPool();
    const [rows] = await pool.query(WALL_QUERY, [categoryId, categoryId]);
    return NextResponse.json(rows.map(toFeedbackItem));
  } catch (error) {
    console.error("wall query failed", error);
    return NextResponse.json(
      { error: "Could not load the feedback wall" },
      { status: 500 },
    );
  }
}
