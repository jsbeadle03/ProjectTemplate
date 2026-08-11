import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { FEEDBACK_SELECT, toManagerItem } from "@/lib/feedback-format";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PENDING_QUERY = `${FEEDBACK_SELECT}
   WHERE c.requires_response = 1
     AND NOT EXISTS (
       SELECT 1 FROM feedback_responses fr WHERE fr.feedback_id = f.id
     )
   ORDER BY f.created_at ASC`;

export async function GET(request) {
  if (!(await requireRole(request, "manager"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(PENDING_QUERY);
    return NextResponse.json(rows.map(toManagerItem));
  } catch (error) {
    console.error("pending responses query failed", error);
    return NextResponse.json(
      { error: "Could not load pending responses" },
      { status: 500 }
    );
  }
}
