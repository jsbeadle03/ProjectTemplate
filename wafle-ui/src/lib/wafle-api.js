export async function getCategories() {
  const res = await fetch("/api/categories");
  if (!res.ok) {
    return [];
  }
  return res.json();
}

const ANONYMOUS_ID_KEY = "wafle-anonymous-id";

// Every seeded feedback row carries this anonymous id.
const DEMO_ANONYMOUS_ID = "11111111-1111-1111-1111-111111111111";

// Temporary bridge until anonymous session ids land in #21: an employee sees
// the status of what they submitted without the app ever linking that feedback
// to their name. Falls back to the seeded id so the demo shows live rows, and
// picks up a real id automatically once #21 starts storing one.
export function getAnonymousId() {
  return (
    window.sessionStorage.getItem(ANONYMOUS_ID_KEY) ?? DEMO_ANONYMOUS_ID
  );
}

export async function getMyFeedback() {
  const res = await fetch(
    `/api/my-feedback?anonymousId=${encodeURIComponent(getAnonymousId())}`,
  );
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function getFeedbackDetail(feedbackId) {
  const res = await fetch(`/api/feedback/${feedbackId}`);
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function markFeedbackRead(feedbackId) {
  const res = await fetch(`/api/feedback/${feedbackId}/read`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Could not update read status. Try again.");
  }
  return res.json();
}

export async function getFeedbackList(categoryId, keyword, status) {
  const params = new URLSearchParams({
    categoryId: categoryId ?? "all",
    keyword: keyword ?? "",
    status: status ?? "all",
  });
  const res = await fetch(`/api/feedback?${params.toString()}`);
  if (!res.ok) {
    return [];
  }
  return res.json();
}
