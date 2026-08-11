export async function getCategories() {
  const res = await fetch("/api/categories");
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function setCategoryRequiresResponse(categoryId, requiresResponse) {
  const res = await fetch(`/api/categories/${categoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requiresResponse }),
  });

  if (!res.ok) {
    throw new Error("Could not update this category. Try again.");
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

export async function respondToFeedback(feedbackId, actionType, responseText) {
  const res = await fetch(`/api/feedback/${feedbackId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actionType, responseText }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error ?? "Choose an action and provide a clear response.");
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

export async function submitFeedback(categoryId, content) {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      anonymousId: getAnonymousId(),
      categoryId,
      content,
    }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error ?? "Could not share feedback. Try again.");
  }

  return res.json();
}

export async function getPendingResponses() {
  const res = await fetch("/api/pending-responses");
  if (!res.ok) {
    return [];
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

export async function getPublicFeedbackWall(categoryId = "all") {
  const params = new URLSearchParams({ categoryId: categoryId ?? "all" });
  const res = await fetch(`/api/wall?${params.toString()}`);
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function reactToFeedback(feedbackId, reaction) {
  const res = await fetch("/api/reactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      feedbackId,
      reaction,
      anonymousId: getAnonymousId(),
    }),
  });
  if (!res.ok) {
    throw new Error("Could not save your reaction.");
  }
  return res.json();
}