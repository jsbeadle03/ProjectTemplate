"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  getCategories,
  getPublicFeedbackWall,
  reactToFeedback,
} from "@/lib/mock-wafle-service";

export default function FeedbackWallPage() {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    getPublicFeedbackWall(categoryId).then((result) => {
      setItems(result);
      setLoading(false);
    });
  }, [categoryId]);

  async function handleReaction(feedbackId, reaction) {
    const updated = await reactToFeedback(feedbackId, reaction);
    setItems((current) =>
      current.map((item) =>
        item.feedbackId === updated.feedbackId ? updated : item,
      ),
    );
  }

  return (
    <div className="page-stack">
      <header className="page-heading heading-with-control">
        <div>
          <span className="eyebrow">Anonymous feedback wall</span>
          <h1>What your team is talking about.</h1>
          <p>Support an idea or see how leadership is responding.</p>
        </div>
        <label className="compact-field">
          <span>Filter by topic</span>
          <select
            onChange={(event) => {
              setLoading(true);
              setCategoryId(event.target.value);
            }}
            value={categoryId}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.categoryId} value={category.categoryId}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="feed-layout">
        <div className="feed-list">
          {loading ? (
            <div className="surface content-skeleton">Loading feedback…</div>
          ) : null}
          {!loading && items.length === 0 ? (
            <div className="surface empty-state">
              <span className="brand-mark" aria-hidden="true" />
              <h2>No feedback in this topic yet.</h2>
              <p>Choose another category or be the first to share.</p>
            </div>
          ) : null}
          {items.map((item) => (
            <article className="surface feed-card" key={item.feedbackId}>
              <div className="feed-card-meta">
                <span>{item.categoryName}</span>
                <span aria-hidden="true">·</span>
                <time>{item.submittedAt}</time>
                <StatusBadge status={item.status} />
              </div>
              <p className="feed-body">{item.body}</p>
              {item.response ? (
                <div className="manager-response">
                  <span className="response-label">
                    Manager response · {item.actionType}
                  </span>
                  <p>{item.response}</p>
                </div>
              ) : null}
              <div className="reaction-row">
                <span>Does this resonate?</span>
                <button
                  aria-label={`Support feedback. ${item.upCount} supports`}
                  onClick={() => handleReaction(item.feedbackId, "up")}
                  type="button"
                >
                  <span aria-hidden="true">↑</span> {item.upCount}
                </button>
                <button
                  aria-label={`Do not support feedback. ${item.downCount} responses`}
                  onClick={() => handleReaction(item.feedbackId, "down")}
                  type="button"
                >
                  <span aria-hidden="true">↓</span> {item.downCount}
                </button>
              </div>
            </article>
          ))}
        </div>

        <aside className="surface feed-sidebar">
          <span className="privacy-orbit" aria-hidden="true" />
          <h2>Built for safer sharing</h2>
          <p>
            Feedback appears without names, email addresses, or employee IDs.
            Reactions are shown only as totals.
          </p>
          <hr />
          <strong>{items.length} conversations</strong>
          <span>in the current view</span>
        </aside>
      </div>
    </div>
  );
}
