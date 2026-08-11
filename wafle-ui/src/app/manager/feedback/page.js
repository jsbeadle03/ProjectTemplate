"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { getCategories, getFeedbackList } from "@/lib/wafle-api";

export default function FeedbackListPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Each keystroke now reaches MariaDB rather than the in-memory mock, so the
  // search waits for a pause in typing before querying.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      getFeedbackList(categoryId, keyword.trim(), status).then((result) => {
        setItems(result);
        setLoading(false);
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [categoryId, keyword, status]);

  const clearFilters = () => {
    setLoading(true);
    setCategoryId("all");
    setKeyword("");
    setStatus("all");
  };

  const trimmedKeyword = keyword.trim();
  const filtersActive =
    categoryId !== "all" || status !== "all" || trimmedKeyword !== "";

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Feedback inbox</span>
          <h1>Listen, sort, and respond.</h1>
          <p>
            Content is anonymous by design. No employee identity is available in
            this view.
          </p>
        </div>
      </header>

      <aside className="identity-warning">
        <span className="privacy-orbit small" aria-hidden="true" />
        Employee identity is intentionally unavailable for every item below.
      </aside>

      <section className="surface filter-panel">
        <label className="search-field">
          <span className="sr-only">Search feedback</span>
          <span aria-hidden="true">⌕</span>
          <input
            onChange={(event) => {
              setLoading(true);
              setKeyword(event.target.value);
            }}
            placeholder="Search feedback"
            type="search"
            value={keyword}
          />
        </label>
        <label className="compact-field">
          <span>Category</span>
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
        <label className="compact-field">
          <span>Status</span>
          <select
            onChange={(event) => {
              setLoading(true);
              setStatus(event.target.value);
            }}
            value={status}
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="responded">Responded</option>
          </select>
        </label>
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={clearFilters}
          disabled={!filtersActive}
        >
          Clear filters
        </button>
      </section>

      <section className="surface inbox-card">
        <div className="inbox-summary">
          <strong>{loading ? "…" : items.length} feedback items</strong>
          <span>Newest first</span>
        </div>
        <div className="feedback-table" role="list">
          {items.map((item) => (
            <Link
              className="feedback-row"
              href={`/manager/feedback/${item.feedbackId}`}
              key={item.feedbackId}
              role="listitem"
            >
              <div className="feedback-row-main">
                <div>
                  <span className="category-label">{item.categoryName}</span>
                  <StatusBadge status={item.status} />
                </div>
                <p>{item.body}</p>
              </div>
              <div className="feedback-row-meta">
                <time>{item.submittedAt}</time>
                <span>{item.upCount} supports</span>
              </div>
              <span className="row-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
          {!loading && items.length === 0 ? (
            <div className="empty-state compact" role="status">
              {trimmedKeyword ? (
                <>
                  <h2>No feedback mentions &ldquo;{trimmedKeyword}&rdquo;.</h2>
                  <p>
                    Try a different word, or clear the search to see all
                    feedback.
                  </p>
                </>
              ) : filtersActive ? (
                <>
                  <h2>No feedback matches these filters.</h2>
                  <p>Clear a filter to widen the results.</p>
                </>
              ) : (
                <>
                  <h2>No feedback yet.</h2>
                  <p>New submissions will appear here as they arrive.</p>
                </>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
