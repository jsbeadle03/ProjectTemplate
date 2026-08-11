import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { CATEGORY_SELECT, toCategory } from "@/lib/categories";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCategoryId(value) {
  const categoryId = Number(value);
  return Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null;
}

export async function PATCH(request, { params }) {
  if (!(await requireRole(request, "manager"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const categoryId = parseCategoryId((await params).id);
  if (!categoryId) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
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

  const updates = [];
  const values = [];

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Give the category a name of 2 to 100 characters." },
        { status: 400 },
      );
    }
    updates.push("name = ?");
    values.push(name);
  }

  if (body.description !== undefined) {
    const description = String(body.description).trim();
    if (description.length > 255) {
      return NextResponse.json(
        { error: "Keep the description under 255 characters." },
        { status: 400 },
      );
    }
    updates.push("description = ?");
    values.push(description);
  }

  if (body.requiresResponse !== undefined) {
    updates.push("requires_response = ?");
    values.push(Boolean(body.requiresResponse));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE categories SET ${updates.join(", ")} WHERE id = ?`,
      [...values, categoryId],
    );

    const [rows] = await pool.query(`${CATEGORY_SELECT} WHERE id = ?`, [
      categoryId,
    ]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(toCategory(rows[0]));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A category with that name already exists." },
        { status: 409 },
      );
    }
    console.error("category update failed", error);
    return NextResponse.json(
      { error: "Could not update category" },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  if (!(await requireRole(request, "manager"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const categoryId = parseCategoryId((await params).id);
  if (!categoryId) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [[{ inUse }]] = await pool.query(
      "SELECT COUNT(*) AS inUse FROM feedback WHERE category_id = ?",
      [categoryId],
    );

    if (inUse > 0) {
      return NextResponse.json(
        {
          error: `This category has ${inUse} piece(s) of feedback. Move or keep them before deleting it.`,
        },
        { status: 409 },
      );
    }

    const [result] = await pool.query("DELETE FROM categories WHERE id = ?", [
      categoryId,
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ categoryId });
  } catch (error) {
    console.error("category delete failed", error);
    return NextResponse.json(
      { error: "Could not delete category" },
      { status: 500 },
    );
  }
}
