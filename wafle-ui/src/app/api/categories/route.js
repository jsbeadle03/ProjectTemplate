import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { CATEGORY_SELECT, toCategory } from "@/lib/categories";
import { getSession, requireRole } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!(await getSession(request))) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(`${CATEGORY_SELECT} ORDER BY name`);
    return NextResponse.json(rows.map(toCategory));
  } catch (error) {
    console.error("categories query failed", error);
    return NextResponse.json(
      { error: "Could not load categories" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  if (!(await requireRole(request, "manager"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const description = (body.description ?? "").trim();
  const requiresResponse = Boolean(body.requiresResponse);

  if (name.length < 2 || name.length > 100 || description.length > 255) {
    return NextResponse.json(
      { error: "Give the category a name of 2 to 100 characters." },
      { status: 400 },
    );
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      "INSERT INTO categories (name, description, requires_response) VALUES (?, ?, ?)",
      [name, description, requiresResponse],
    );

    return NextResponse.json(
      { categoryId: result.insertId, name, description, requiresResponse },
      { status: 201 },
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A category with that name already exists." },
        { status: 409 },
      );
    }
    console.error("category create failed", error);
    return NextResponse.json(
      { error: "Could not create category" },
      { status: 500 },
    );
  }
}
