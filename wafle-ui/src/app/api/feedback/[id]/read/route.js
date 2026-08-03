import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { DETAIL_QUERY, parseFeedbackId, toDetail } from "@/lib/feedback-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const { id } = await params;
  const feedbackId = parseFeedbackId(id);

  if (!feedbackId) {
    return NextResponse.json({ error: "Invalid feedback id" }, { status: 400 });
  }

  try {
    const pool = getPool();

    // COALESCE keeps the original timestamp if this feedback was already
    // acknowledged, so re-sending the action never rewrites when it was first
    // read.
    await pool.query(
      `UPDATE feedback
         SET is_read = 1,
             read_at = COALESCE(read_at, NOW())
       WHERE id = ?`,
      [feedbackId],
    );

    const [rows] = await pool.query(DETAIL_QUERY, [feedbackId]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(toDetail(rows[0]));
  } catch (error) {
    console.error("mark feedback read failed", error);
    return NextResponse.json(
      { error: "Could not update read status" },
      { status: 500 },
    );
  }
}
