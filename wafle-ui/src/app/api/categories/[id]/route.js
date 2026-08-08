import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCategoryId(value) {
  const categoryId = Number(value);
  return Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null;
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const categoryId = parseCategoryId(id);

  if (!categoryId) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  const body = await request.json();
  const requiresResponse = Boolean(body.requiresResponse);

  try {
    const pool = getPool();
    await pool.query(
      "UPDATE categories SET requires_response = ? WHERE id = ?",
      [requiresResponse, categoryId]
    );

    const [rows] = await pool.query(
      "SELECT id AS categoryId, name, requires_response AS requiresResponse FROM categories WHERE id = ?",
      [categoryId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({
      categoryId: rows[0].categoryId,
      name: rows[0].name,
      requiresResponse: Boolean(rows[0].requiresResponse),
    });
  } catch (error) {
    console.error("category update failed", error);
    return NextResponse.json(
      { error: "Could not update category" },
      { status: 500 }
    );
  }
}
