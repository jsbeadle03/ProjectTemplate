import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REACTION_MAP = { up: "like", down: "dislike" };

async function getCounts(pool, feedbackId) {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(reaction = 'like'), 0) AS upCount,
       COALESCE(SUM(reaction = 'dislike'), 0) AS downCount
     FROM feedback_reactions
     WHERE feedback_id = ?`,
    [feedbackId]
  );
  return {
    upCount: Number(rows[0].upCount),
    downCount: Number(rows[0].downCount),
  };
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const feedbackId = Number(payload.feedbackId);
  const nextReaction = REACTION_MAP[payload.reaction];
  const anonymousId = payload.anonymousId;

  if (!feedbackId || !nextReaction || !anonymousId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const pool = getPool();

    const [existingRows] = await pool.query(
      "SELECT reaction FROM feedback_reactions WHERE feedback_id = ? AND anonymous_id = ?",
      [feedbackId, anonymousId]
    );
    const current = existingRows.length > 0 ? existingRows[0].reaction : null;

    let myReaction;
    if (current === nextReaction) {
      await pool.query(
        "DELETE FROM feedback_reactions WHERE feedback_id = ? AND anonymous_id = ?",
        [feedbackId, anonymousId]
      );
      myReaction = null;
    } else if (current) {
      await pool.query(
        "UPDATE feedback_reactions SET reaction = ? WHERE feedback_id = ? AND anonymous_id = ?",
        [nextReaction, feedbackId, anonymousId]
      );
      myReaction = payload.reaction;
    } else {
      await pool.query(
        "INSERT INTO feedback_reactions (feedback_id, anonymous_id, reaction) VALUES (?, ?, ?)",
        [feedbackId, anonymousId, nextReaction]
      );
      myReaction = payload.reaction;
    }

    const counts = await getCounts(pool, feedbackId);

    return NextResponse.json({
      feedbackId,
      upCount: counts.upCount,
      downCount: counts.downCount,
      myReaction,
    });
  } catch (error) {
    console.error("reaction save failed", error);
    return NextResponse.json(
      { error: "Could not save your reaction" },
      { status: 500 }
    );
  }
}