import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Scoped to the caller's own id in the WHERE clause, so a manager cannot accept
// or remove someone who chose a different manager.
export async function PATCH(request, { params }) {
  const manager = await requireRole(request, "manager");
  if (!manager) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const employeeId = parseId((await params).id);
  if (!employeeId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `UPDATE users SET link_status = 'accepted'
        WHERE id = ? AND manager_id = ? AND link_status = 'pending'`,
      [employeeId, manager.userId],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "No pending request from that person." },
        { status: 404 },
      );
    }

    return NextResponse.json({ id: employeeId, linkStatus: "accepted" });
  } catch (error) {
    console.error("team accept failed", error);
    return NextResponse.json(
      { error: "Could not accept this person" },
      { status: 500 },
    );
  }
}

// Their feedback keeps the manager_id stamped on it at submission, so removing
// someone does not take away what they already shared.
export async function DELETE(request, { params }) {
  const manager = await requireRole(request, "manager");
  if (!manager) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const employeeId = parseId((await params).id);
  if (!employeeId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `UPDATE users SET manager_id = NULL, link_status = NULL
        WHERE id = ? AND manager_id = ?`,
      [employeeId, manager.userId],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "That person is not on your team." },
        { status: 404 },
      );
    }

    return NextResponse.json({ id: employeeId });
  } catch (error) {
    console.error("team remove failed", error);
    return NextResponse.json(
      { error: "Could not remove this person" },
      { status: 500 },
    );
  }
}
