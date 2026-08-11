import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { FEEDBACK_SELECT, toManagerItem } from "@/lib/feedback-format";
import { getSession, requireRole } from "@/lib/session";

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
  if (!(await requireRole(request, "manager"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

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

// The submission form advertises a 12-800 character range, so the API holds
// employees to the same bounds rather than trusting the textarea's maxLength.
const MIN_CONTENT_LENGTH = 12;
const MAX_CONTENT_LENGTH = 800;

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const anonymousId = session.anonymousId;
  const categoryId = Number(body.categoryId);
  const content = (body.content ?? "").trim();
  const moodScore =
    body.moodScore === null || body.moodScore === undefined
      ? null
      : Number(body.moodScore);

  if (
    !anonymousId ||
    !Number.isInteger(categoryId) ||
    content.length < MIN_CONTENT_LENGTH
  ) {
    return NextResponse.json(
      { error: "Choose a category and share at least 12 characters." },
      { status: 400 }
    );
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `Keep feedback under ${MAX_CONTENT_LENGTH} characters.` },
      { status: 400 }
    );
  }

  if (
    moodScore !== null &&
    !(Number.isInteger(moodScore) && moodScore >= 1 && moodScore <= 5)
  ) {
    return NextResponse.json(
      { error: "Mood must be between 1 and 5." },
      { status: 400 }
    );
  }

  try {
    const pool = getPool();

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

    // The feedback is already saved, so a mood failure is logged rather than
    // failing a submission the employee has already made.
    if (moodScore !== null) {
      try {
        await pool.query(
          "INSERT INTO mood_checkins (anonymous_id, mood_rating) VALUES (?, ?)",
          [anonymousId, moodScore]
        );
      } catch (moodError) {
        console.error("mood check-in insert failed", moodError);
      }
    }

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
