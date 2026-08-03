import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// feedback.anonymous_id has a foreign key into users.anonymous_id, so an
// employee's pseudonym has to be the stable one already stored on their
// account rather than a freshly generated UUID. Only that pseudonym is
// returned here — never the id, role, or email it belongs to.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "An email is required" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT anonymous_id AS anonymousId FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ anonymousId: rows[0].anonymousId });
  } catch (error) {
    console.error("anonymous id lookup failed", error);
    return NextResponse.json(
      { error: "Could not look up anonymous id" },
      { status: 500 }
    );
  }
}
