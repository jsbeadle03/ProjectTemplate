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
