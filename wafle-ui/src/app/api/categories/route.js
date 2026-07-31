import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id AS categoryId, name FROM categories ORDER BY name"
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("categories query failed", error);
    return NextResponse.json(
      { error: "Could not load categories" },
      { status: 500 }
    );
  }
}
