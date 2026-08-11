import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Choosing a different manager returns the employee to pending: the new manager
// has to accept them before anything reaches that manager's inbox.
export async function PATCH(request) {
  const employee = await requireRole(request, "employee");
  if (!employee) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
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

  const managerId = Number(body.managerId);
  if (!Number.isInteger(managerId) || managerId < 1) {
    return NextResponse.json({ error: "Choose a manager." }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [managers] = await pool.query(
      "SELECT 1 FROM users WHERE id = ? AND role = 'manager'",
      [managerId],
    );
    if (managers.length === 0) {
      return NextResponse.json({ error: "Choose a manager." }, { status: 400 });
    }

    await pool.query(
      "UPDATE users SET manager_id = ?, link_status = 'pending' WHERE id = ?",
      [managerId, employee.userId],
    );

    return NextResponse.json({ managerId, linkStatus: "pending" });
  } catch (error) {
    console.error("manager change failed", error);
    return NextResponse.json(
      { error: "Could not update your manager" },
      { status: 500 },
    );
  }
}
