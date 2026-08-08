import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { FEEDBACK_SELECT, toManagerItem } from "@/lib/feedback-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// `%` and `_` are LIKE wildcards, so a search for "100%" would otherwise
// match far more than the manager typed. Escaping keeps the term literal.
// `!` is the escape character rather than a backslash, which would need
// doubling through both the template literal and MariaDB's parser.
function escapeLikeTerm(value) {
  return value.replace(/[!%_]/g, (character) => `!${character}`);
}

const LIST_QUERY = `${FEEDBACK_SELECT}
   WHERE (? = 'all' OR c.id = ?)
     AND (? = '' OR f.content LIKE CONCAT('%', ?, '%') ESCAPE '!')
   ORDER BY f.created_at DESC`;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") ?? "all";
  const keyword = (searchParams.get("keyword") ?? "").trim();
  const status = searchParams.get("status") ?? "all";
  const searchTerm = escapeLikeTerm(keyword);

  try {
    const pool = getPool();
    const [rows] = await pool.query(LIST_QUERY, [
      categoryId,
      categoryId,
      searchTerm,
      searchTerm,
    ]);

    const items = rows
      .map(toManagerItem)
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

export async function POST(request) {
  const body = await request.json();
  const anonymousId = (body.anonymousId ?? "").trim();
  const categoryId = Number(body.categoryId);
  const content = (body.content ?? "").trim();

  if (!anonymousId || !Number.isInteger(categoryId) || content.length < 12) {
    return NextResponse.json(
      { error: "Choose a category and share at least 12 characters." },
      { status: 400 }
    );
  }

  try {
    const pool = getPool();

    // The anonymous id has to belong to a real account, both because of the
    // foreign key on feedback.anonymous_id and so a forged id can't be used
    // to attribute feedback to someone else's pseudonym.
    const [userRows] = await pool.query(
      "SELECT 1 FROM users WHERE anonymous_id = ?",
      [anonymousId]
    );
    if (userRows.length === 0) {
      return NextResponse.json(
        { error: "Unrecognized session. Please log in again." },
        { status: 400 }
      );
    }

    const [categoryRows] = await pool.query(
      "SELECT requires_response AS requiresResponse FROM categories WHERE id = ?",
      [categoryId]
    );
    if (categoryRows.length === 0) {
      return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    }

    const [result] = await pool.query(
      "INSERT INTO feedback (anonymous_id, category_id, content) VALUES (?, ?, ?)",
      [anonymousId, categoryId, content]
    );

    return NextResponse.json({
      feedbackId: result.insertId,
      requiresResponse: Boolean(categoryRows[0].requiresResponse),
    });
  } catch (error) {
    console.error("feedback submission failed", error);
    return NextResponse.json(
      { error: "Could not share feedback" },
      { status: 500 }
    );
  }
}
