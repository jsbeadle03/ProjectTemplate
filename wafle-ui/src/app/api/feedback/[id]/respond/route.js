import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { DETAIL_QUERY, parseFeedbackId, toDetail } from "@/lib/feedback-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTION_TYPES = [
  "Investigating",
  "Will do",
  "Won't do",
  "No action needed",
];

export async function POST(request, { params }) {
  const { id } = await params;
  const feedbackId = parseFeedbackId(id);

  if (!feedbackId) {
    return NextResponse.json({ error: "Invalid feedback id" }, { status: 400 });
  }

  const body = await request.json();
  const actionType = body.actionType;
  const responseText = (body.responseText ?? "").trim();

  if (
    !ALLOWED_ACTION_TYPES.includes(actionType) ||
    responseText.length < 12
  ) {
    return NextResponse.json(
      { error: "Choose an action and provide a clear response." },
      { status: 400 }
    );
  }

  try {
    const pool = getPool();

    // Demo-scale: the schema has one manager account, so the response is
    // attributed to whichever manager row exists rather than a signed-in id.
    const [managerRows] = await pool.query(
      "SELECT id FROM users WHERE role = 'manager' ORDER BY id LIMIT 1"
    );
    if (managerRows.length === 0) {
      return NextResponse.json(
        { error: "No manager account is configured" },
        { status: 500 }
      );
    }

    await pool.query(
      `INSERT INTO feedback_responses (feedback_id, responded_by, response_text, action_type)
       VALUES (?, ?, ?, ?)`,
      [feedbackId, managerRows[0].id, responseText, actionType]
    );

    await pool.query(
      `UPDATE feedback
         SET is_read = 1,
             read_at = COALESCE(read_at, NOW())
       WHERE id = ?`,
      [feedbackId]
    );

    const [rows] = await pool.query(DETAIL_QUERY, [feedbackId]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(toDetail(rows[0]));
  } catch (error) {
    console.error("feedback response failed", error);
    return NextResponse.json(
      { error: "Could not post response" },
      { status: 500 }
    );
  }
}
