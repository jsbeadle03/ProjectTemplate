import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  DETAIL_QUERY,
  parseFeedbackId,
  toFeedbackItem,
} from "@/lib/feedback-format";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTION_TYPES = [
  "Investigating",
  "Will do",
  "Won't do",
  "No action needed",
];

const MIN_RESPONSE_LENGTH = 12;
const MAX_RESPONSE_LENGTH = 2000;

export async function POST(request, { params }) {
  const manager = await requireRole(request, "manager");
  if (!manager) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const feedbackId = parseFeedbackId(id);

  if (!feedbackId) {
    return NextResponse.json({ error: "Invalid feedback id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const actionType = body.actionType;
  const responseText = (body.responseText ?? "").trim();

  if (
    !ALLOWED_ACTION_TYPES.includes(actionType) ||
    responseText.length < MIN_RESPONSE_LENGTH ||
    responseText.length > MAX_RESPONSE_LENGTH
  ) {
    return NextResponse.json(
      { error: "Choose an action and provide a clear response." },
      { status: 400 },
    );
  }

  try {
    const pool = getPool();

    await pool.query(
      `INSERT INTO feedback_responses (feedback_id, responded_by, response_text, action_type)
       VALUES (?, ?, ?, ?)`,
      [feedbackId, manager.userId, responseText, actionType],
    );

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

    return NextResponse.json(toFeedbackItem(rows[0]));
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 },
      );
    }
    console.error("feedback response failed", error);
    return NextResponse.json(
      { error: "Could not post response" },
      { status: 500 },
    );
  }
}
