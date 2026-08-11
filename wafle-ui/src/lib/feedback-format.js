export function toStatus(row) {
  if (Number(row.responseCount) > 0) {
    return "Responded";
  }
  if (row.isRead) {
    return "Acknowledged";
  }
  return "New";
}

// `new Date(null)` is the epoch rather than an invalid date, so empty values
// are rejected before parsing instead of rendering as "Dec 31, 1969".
function toDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateLabel(value) {
  const date = toDate(value);
  if (!date) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function toDateTimeLabel(value) {
  const date = toDate(value);
  if (!date) {
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
     c.requires_response AS requiresResponse,
     (SELECT COUNT(*) FROM feedback_reactions r
        WHERE r.feedback_id = f.id AND r.reaction = 'like') AS upCount,
     (SELECT COUNT(*) FROM feedback_reactions r
        WHERE r.feedback_id = f.id AND r.reaction = 'dislike') AS downCount,
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

export const WALL_QUERY = `${FEEDBACK_SELECT}
   WHERE (? = 'all' OR c.id = ?)
   ORDER BY f.created_at DESC`;

export const LIST_QUERY = `${FEEDBACK_SELECT}
   WHERE (? = 'all' OR c.id = ?)
     AND (? = '' OR f.content LIKE CONCAT('%', ?, '%') ESCAPE '!')
   ORDER BY f.created_at DESC`;

// `%` and `_` are LIKE wildcards, so a search for "100%" would otherwise match
// far more than the manager typed. `!` is the escape character rather than a
// backslash, which would need doubling through MariaDB's parser too.
export function escapeLikeTerm(value) {
  return value.replace(/[!%_]/g, (character) => `!${character}`);
}

// Feedback ids arrive from the URL, so they are validated before querying.
export function parseFeedbackId(value) {
  const feedbackId = Number(value);
  return Number.isInteger(feedbackId) && feedbackId > 0 ? feedbackId : null;
}

// Whitelists exactly the fields a view is allowed to render, so a column added
// to FEEDBACK_SELECT later cannot leak into a response just by being present
// on the row.
export function toFeedbackItem(row) {
  return {
    feedbackId: row.feedbackId,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    body: row.body,
    status: toStatus(row),
    upCount: Number(row.upCount),
    downCount: Number(row.downCount),
    submittedAt: toDateLabel(row.createdAt),
    isRead: Boolean(row.isRead),
    readAt: row.readAt ? toDateTimeLabel(row.readAt) : "",
    response: row.response ?? "",
    actionType: row.actionType ?? "",
    requiresResponse: Boolean(row.requiresResponse),
  };
}
