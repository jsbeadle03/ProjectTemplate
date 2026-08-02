import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { MY_FEEDBACK_QUERY, toDetail } from "@/lib/feedback-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const anonymousId = (searchParams.get("anonymousId") ?? "").trim();

  if (!anonymousId) {
    return NextResponse.json(
      { error: "An anonymous id is required" },
      { status: 400 },
    );
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(MY_FEEDBACK_QUERY, [anonymousId]);
    return NextResponse.json(rows.map(toDetail));
  } catch (error) {
    console.error("my feedback query failed", error);
    return NextResponse.json(
      { error: "Could not load your feedback" },
      { status: 500 },
    );
  }
}
