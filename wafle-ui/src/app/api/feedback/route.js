import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toStatus(row) {
  if (row.responseCount > 0) {
    return "Responded";
  }
  if (row.isRead) {
    return "Acknowledged";
  }
  return "New";
}

function toDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") ?? "all";
  const keyword = searchParams.get("keyword") ?? "";
  const status = searchParams.get("status") ?? "all";

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT
         f.id AS feedbackId,
         f.content AS body,
         f.is_read AS isRead,
         f.created_at AS createdAt,
         c.id AS categoryId,
         c.name AS categoryName,
         (SELECT COUNT(*) FROM feedback_reactions r
            WHERE r.feedback_id = f.id AND r.reaction = 'like') AS upCount,
         (SELECT COUNT(*) FROM feedback_responses fr
            WHERE fr.feedback_id = f.id) AS responseCount
       FROM feedback f
       JOIN categories c ON f.category_id = c.id
       WHERE (? = 'all' OR c.id = ?)
         AND (? = '' OR f.content LIKE CONCAT('%', ?, '%'))
       ORDER BY f.created_at DESC`,
      [categoryId, categoryId, keyword, keyword]
    );

    const items = rows
      .map((row) => ({
        feedbackId: row.feedbackId,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        body: row.body,
        status: toStatus(row),
        upCount: Number(row.upCount),
        submittedAt: toDateLabel(row.createdAt),
      }))
      .filter(
        (item) => status === "all" || item.status.toLowerCase() === status
      );

    return NextResponse.json(items);
  } catch (error) {
    console.error("feedback query failed", error);
    return NextResponse.json(
      { error: "Could not load feedback" },
      { status: 500 }
    );
  }
}
