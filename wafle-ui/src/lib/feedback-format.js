// Shared query and shaping helpers for the feedback API routes, so the inbox,
// the detail view, and the acknowledge action all derive status, dates, and
// read state the same way.

export function toStatus(row) {
  if (Number(row.responseCount) > 0) {
    return "Responded";
  }
  if (row.isRead) {
    return "Acknowledged";
  }
  return "New";
}

export function toDateLabel(value) {
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

export function toDateTimeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// f.anonymous_id is deliberately never selected here and `users` is never
// joined in, so no query built on FEEDBACK_SELECT can leak who submitted
// feedback into a manager-facing response.
export const FEEDBACK_SELECT = `SELECT
     f.id AS feedbackId,
     f.content AS body,
     f.is_read AS isRead,
     f.read_at AS readAt,
     f.created_at AS createdAt,
     c.id AS categoryId,
     c.name AS categoryName,
     (SELECT COUNT(*) FROM feedback_reactions r
        WHERE r.feedback_id = f.id AND r.reaction = 'like') AS upCount,
     (SELECT COUNT(*) FROM feedback_responses fr
        WHERE fr.feedback_id = f.id) AS responseCount,
     (SELECT fr.response_text FROM feedback_responses fr
        WHERE fr.feedback_id = f.id
        ORDER BY fr.created_at DESC LIMIT 1) AS response,
     (SELECT fr.action_type FROM feedback_responses fr
        WHERE fr.feedback_id = f.id
        ORDER BY fr.created_at DESC LIMIT 1) AS actionType
   FROM feedback f
   JOIN categories c ON f.category_id = c.id`;

export const DETAIL_QUERY = `${FEEDBACK_SELECT} WHERE f.id = ?`;

// An employee only ever sees their own submissions, matched on the anonymous
// id rather than any column that could identify them.
export const MY_FEEDBACK_QUERY = `${FEEDBACK_SELECT}
   WHERE f.anonymous_id = ?
   ORDER BY f.created_at DESC`;

export function toDetail(row) {
  return {
    feedbackId: row.feedbackId,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    body: row.body,
    status: toStatus(row),
    upCount: Number(row.upCount),
    submittedAt: toDateLabel(row.createdAt),
    isRead: Boolean(row.isRead),
    readAt: row.readAt ? toDateTimeLabel(row.readAt) : "",
    response: row.response ?? "",
    actionType: row.actionType ?? "",
  };
}

// Feedback ids arrive from the URL, so they are validated before querying.
export function parseFeedbackId(value) {
  const feedbackId = Number(value);
  return Number.isInteger(feedbackId) && feedbackId > 0 ? feedbackId : null;
}

// Whitelists exactly the fields a manager view is allowed to render, so a
// column added to FEEDBACK_SELECT later can never leak into a manager
// response just by being present on the row.
export function toManagerItem(row) {
  return {
    feedbackId: row.feedbackId,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    body: row.body,
    status: toStatus(row),
    upCount: Number(row.upCount),
    submittedAt: toDateLabel(row.createdAt),
    isRead: Boolean(row.isRead),
    readAt: row.readAt ? toDateTimeLabel(row.readAt) : "",
    response: row.response ?? "",
    actionType: row.actionType ?? "",
  };
}
