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

export async function GET(request, { params }) {
  if (!(await requireRole(request, "manager"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const feedbackId = parseFeedbackId(id);

  if (!feedbackId) {
    return NextResponse.json({ error: "Invalid feedback id" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(DETAIL_QUERY, [feedbackId]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(toFeedbackItem(rows[0]));
  } catch (error) {
    console.error("feedback detail query failed", error);
    return NextResponse.json(
      { error: "Could not load feedback" },
      { status: 500 },
    );
  }
}
