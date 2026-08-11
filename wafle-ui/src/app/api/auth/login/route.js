import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The same message for an unknown email and a wrong password, so this endpoint
// cannot be used to discover which addresses have accounts.
const INVALID_CREDENTIALS = "That email and password do not match.";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, password_hash AS passwordHash, role,
              anonymous_id AS anonymousId, display_name AS displayName
         FROM users WHERE email = ?`,
      [email],
    );

    const account = rows[0];
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const user = {
      id: account.id,
      role: account.role,
      anonymousId: account.anonymousId,
      displayName: account.displayName,
    };
    const response = NextResponse.json(user);
    response.cookies.set(
      SESSION_COOKIE,
      await createSession(user),
      sessionCookieOptions,
    );
    return response;
  } catch (error) {
    console.error("login failed", error);
    return NextResponse.json(
      { error: "Could not sign you in" },
      { status: 500 },
    );
  }
}
