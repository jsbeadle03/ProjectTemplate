import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { FEEDBACK_SELECT, toFeedbackItem } from "@/lib/feedback-format";
import { requireRole } from "@/lib/session";
import { hasEnoughSubmitters } from "@/lib/team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PENDING_QUERY = `${FEEDBACK_SELECT}
   WHERE f.manager_id = ?
     AND c.requires_response = 1
     AND NOT EXISTS (
       SELECT 1 FROM feedback_responses fr WHERE fr.feedback_id = f.id
     )
   ORDER BY f.created_at ASC`;

export async function GET(request) {
  const manager = await requireRole(request, "manager");
  if (!manager) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const pool = getPool();

    if (!(await hasEnoughSubmitters(pool, manager.userId))) {
      return NextResponse.json({ items: [], suppressed: true });
    }

    const [rows] = await pool.query(PENDING_QUERY, [manager.userId]);
    return NextResponse.json({
      items: rows.map(toFeedbackItem),
      suppressed: false,
    });
  } catch (error) {
    console.error("pending responses query failed", error);
    return NextResponse.json(
      { error: "Could not load pending responses" },
      { status: 500 },
    );
  }
}
