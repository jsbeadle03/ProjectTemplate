import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id AS categoryId, name, requires_response AS requiresResponse FROM categories ORDER BY name"
    );
    const items = rows.map((row) => ({
      categoryId: row.categoryId,
      name: row.name,
      requiresResponse: Boolean(row.requiresResponse),
    }));
    return NextResponse.json(items);
  } catch (error) {
    console.error("categories query failed", error);
    return NextResponse.json(
      { error: "Could not load categories" },
      { status: 500 }
    );
  }
}
