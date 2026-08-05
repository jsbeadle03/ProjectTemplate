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

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT
         f.id AS feedbackId,
         f.content AS body,
         f.is_read AS isRead,
         f.created_at AS createdAt,
         c.name AS categoryName,
         (SELECT COUNT(*) FROM feedback_reactions r
            WHERE r.feedback_id = f.id AND r.reaction = 'like') AS upCount,
         (SELECT COUNT(*) FROM feedback_reactions r
            WHERE r.feedback_id = f.id AND r.reaction = 'dislike') AS downCount,
         (SELECT COUNT(*) FROM feedback_responses fr
            WHERE fr.feedback_id = f.id) AS responseCount
       FROM feedback f
       JOIN categories c ON f.category_id = c.id
       WHERE (? = 'all' OR c.id = ?)
       ORDER BY f.created_at DESC`,
      [categoryId, categoryId]
    );

    const items = rows.map((row) => ({
      feedbackId: row.feedbackId,
      categoryName: row.categoryName,
      body: row.body,
      status: toStatus(row),
      submittedAt: toDateLabel(row.createdAt),
      upCount: Number(row.upCount),
      downCount: Number(row.downCount),
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error("wall query failed", error);
    return NextResponse.json(
      { error: "Could not load the feedback wall" },
      { status: 500 }
    );
  }
}
