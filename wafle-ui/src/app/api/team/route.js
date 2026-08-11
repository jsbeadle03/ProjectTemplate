import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// anonymous_id is deliberately never selected: it is the join key between a
// person and their feedback, and this is a manager-facing response.
export async function GET(request) {
  const manager = await requireRole(request, "manager");
  if (!manager) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, display_name AS displayName, link_status AS linkStatus
         FROM users
        WHERE manager_id = ? AND link_status IS NOT NULL
        ORDER BY link_status, display_name`,
      [manager.userId],
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("team query failed", error);
    return NextResponse.json(
      { error: "Could not load your team" },
      { status: 500 },
    );
  }
}
