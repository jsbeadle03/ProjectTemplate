import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TODAY_QUERY = `SELECT mood_rating AS moodRating
   FROM mood_checkins
  WHERE anonymous_id = ? AND created_at >= CURDATE()
  ORDER BY id DESC LIMIT 1`;

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(TODAY_QUERY, [session.anonymousId]);
    return NextResponse.json({
      checkedIn: rows.length > 0,
      moodRating: rows[0]?.moodRating ?? null,
    });
  } catch (error) {
    console.error("mood check-in lookup failed", error);
    return NextResponse.json(
      { error: "Could not load your check-in" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
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

  const moodRating = Number(body.moodRating);
  if (!Number.isInteger(moodRating) || moodRating < 1 || moodRating > 5) {
    return NextResponse.json(
      { error: "Choose a mood from one to five." },
      { status: 400 },
    );
  }

  try {
    const pool = getPool();
    const [existing] = await pool.query(TODAY_QUERY, [session.anonymousId]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "You have already checked in today." },
        { status: 409 },
      );
    }

    await pool.query(
      "INSERT INTO mood_checkins (anonymous_id, mood_rating) VALUES (?, ?)",
      [session.anonymousId, moodRating],
    );

    return NextResponse.json({
      checkedIn: true,
      moodRating,
      message: "Check-in recorded. Your manager will only see the team trend.",
    });
  } catch (error) {
    console.error("mood check-in failed", error);
    return NextResponse.json(
      { error: "Could not save your check-in" },
      { status: 500 },
    );
  }
}
