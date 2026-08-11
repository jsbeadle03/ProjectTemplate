import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { MY_FEEDBACK_QUERY, toDetail } from "@/lib/feedback-format";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(MY_FEEDBACK_QUERY, [session.anonymousId]);
    return NextResponse.json(rows.map(toDetail));
  } catch (error) {
    console.error("my feedback query failed", error);
    return NextResponse.json(
      { error: "Could not load your feedback" },
      { status: 500 },
    );
  }
}
