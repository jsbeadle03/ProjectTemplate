import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  DETAIL_QUERY,
  parseFeedbackId,
  toFeedbackItem,
} from "@/lib/feedback-format";
import { requireRole } from "@/lib/session";
import { hasEnoughSubmitters } from "@/lib/team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const manager = await requireRole(request, "manager");
  if (!manager) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const feedbackId = parseFeedbackId(id);

  if (!feedbackId) {
    return NextResponse.json({ error: "Invalid feedback id" }, { status: 400 });
  }

  try {
    const pool = getPool();

    if (!(await hasEnoughSubmitters(pool, manager.userId))) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 },
      );
    }

    const [rows] = await pool.query(DETAIL_QUERY, [feedbackId, manager.userId]);

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
