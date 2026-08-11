import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Team trends are only shown once enough people have checked in, so a small
// team cannot be narrowed down to one person's mood.
const MIN_PARTICIPANTS = 3;
const WINDOW_DAYS = 14;

export async function GET(request) {
  if (!(await requireRole(request, "manager"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const pool = getPool();

    const [[mood]] = await pool.query(
      `SELECT AVG(mood_rating) AS average,
              COUNT(DISTINCT anonymous_id) AS participants
         FROM mood_checkins
        WHERE created_at >= NOW() - INTERVAL ? DAY`,
      [WINDOW_DAYS],
    );

    const [[previous]] = await pool.query(
      `SELECT AVG(mood_rating) AS average
         FROM mood_checkins
        WHERE created_at >= NOW() - INTERVAL ? DAY
          AND created_at < NOW() - INTERVAL ? DAY`,
      [WINDOW_DAYS * 2, WINDOW_DAYS],
    );

    const [[employees]] = await pool.query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'employee'",
    );

    const [[feedback]] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(EXISTS (SELECT 1 FROM feedback_responses fr WHERE fr.feedback_id = f.id)) AS answered,
              SUM(NOT EXISTS (SELECT 1 FROM feedback_responses fr WHERE fr.feedback_id = f.id)) AS open
         FROM feedback f`,
    );

    const [trend] = await pool.query(
      `SELECT DATE(created_at) AS day, AVG(mood_rating) AS average
         FROM mood_checkins
        WHERE created_at >= NOW() - INTERVAL 7 DAY
        GROUP BY DATE(created_at)
        ORDER BY day`,
    );

    const [categories] = await pool.query(
      `SELECT c.name, COUNT(f.id) AS count
         FROM categories c
         LEFT JOIN feedback f ON f.category_id = c.id
        GROUP BY c.id, c.name
        HAVING count > 0
        ORDER BY count DESC, c.name`,
    );

    const participants = Number(mood.participants);
    const hasEnough = participants >= MIN_PARTICIPANTS;
    const average = mood.average === null ? null : Number(mood.average);
    const previousAverage =
      previous.average === null ? null : Number(previous.average);
    const totalFeedback = Number(feedback.total);
    const maxCategoryCount = Math.max(
      1,
      ...categories.map((row) => Number(row.count)),
    );

    return NextResponse.json({
      avgMood: hasEnough && average !== null ? Number(average.toFixed(1)) : null,
      moodChange:
        hasEnough && average !== null && previousAverage !== null
          ? `${average >= previousAverage ? "+" : ""}${(average - previousAverage).toFixed(1)}`
          : null,
      participants,
      eligibleUsers: Number(employees.total),
      participationRate: employees.total
        ? Math.round((participants / Number(employees.total)) * 100)
        : 0,
      openFeedback: Number(feedback.open ?? 0),
      responseRate: totalFeedback
        ? Math.round((Number(feedback.answered ?? 0) / totalFeedback) * 100)
        : 0,
      moodTrend: hasEnough
        ? trend.map((row) => ({
            day: new Date(row.day).toLocaleDateString("en-US", {
              weekday: "short",
            }),
            value: Number(Number(row.average).toFixed(1)),
          }))
        : [],
      categories: categories.map((row) => ({
        name: row.name,
        count: Number(row.count),
        percentage: Math.round((Number(row.count) / maxCategoryCount) * 100),
      })),
      privacyNotice: hasEnough
        ? null
        : `Mood trends stay hidden until at least ${MIN_PARTICIPANTS} people have checked in.`,
    });
  } catch (error) {
    console.error("dashboard query failed", error);
    return NextResponse.json(
      { error: "Could not load the dashboard" },
      { status: 500 },
    );
  }
}
