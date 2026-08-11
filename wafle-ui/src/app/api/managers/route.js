import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Answers before sign-in, because the registration form has to offer a manager
// to choose. Returns names only — never an email, a role, or an anonymous id.
export async function GET() {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, display_name AS displayName FROM users WHERE role = 'manager' ORDER BY display_name",
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("managers query failed", error);
    return NextResponse.json(
      { error: "Could not load managers" },
      { status: 500 },
    );
  }
}
