import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import { ROLES } from "@/lib/team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 10;

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
  const displayName = (body.displayName ?? "").trim();
  const role = body.role;
  const managerId = Number(body.managerId);

  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Choose a role." }, { status: 400 });
  }

  if (role === "employee" && !(Number.isInteger(managerId) && managerId > 0)) {
    return NextResponse.json(
      { error: "Choose the manager you report to." },
      { status: 400 },
    );
  }

  if (email.length > 255 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    return NextResponse.json(
      {
        error: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  if (displayName.length < 2 || displayName.length > 120) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [existing] = await pool.query("SELECT 1 FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }

    if (role === "employee") {
      const [managers] = await pool.query(
        "SELECT 1 FROM users WHERE id = ? AND role = 'manager'",
        [managerId],
      );
      if (managers.length === 0) {
        return NextResponse.json(
          { error: "Choose the manager you report to." },
          { status: 400 },
        );
      }
    }

    const anonymousId = crypto.randomUUID();
    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, role, anonymous_id, display_name, manager_id, link_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        await bcrypt.hash(password, 12),
        role,
        anonymousId,
        displayName,
        role === "employee" ? managerId : null,
        role === "employee" ? "pending" : null,
      ],
    );

    const user = {
      id: result.insertId,
      role,
      anonymousId,
      displayName,
    };
    const response = NextResponse.json(user);
    response.cookies.set(
      SESSION_COOKIE,
      await createSession(user),
      sessionCookieOptions,
    );
    return response;
  } catch (error) {
    console.error("registration failed", error);
    return NextResponse.json(
      { error: "Could not create your account" },
      { status: 500 },
    );
  }
}
