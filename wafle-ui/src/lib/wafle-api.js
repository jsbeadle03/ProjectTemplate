export async function getCategories() {
  const res = await fetch("/api/categories");
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
