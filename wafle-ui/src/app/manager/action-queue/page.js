"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { getPendingResponses } from "@/lib/mock-wafle-service";

export default function ActionQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPendingResponses().then((result) => {
      setItems(result);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-stack">
      <header className="page-heading home-heading">
        <div>
          <span className="eyebrow">Action queue</span>
          <h1>Feedback waiting on leadership.</h1>
          <p>
            Tools and process topics require a visible response before they can
            be closed.
          </p>
        </div>
        <span className="queue-count">{loading ? "…" : items.length} open</span>
      </header>

      <aside className="queue-explainer">
        <span className="queue-icon" aria-hidden="true">
          !
        </span>
        <div>
          <strong>Required-response category</strong>
          <p>
            Acknowledge each item quickly, then post a clear next step when one
            is available.
          </p>
        </div>
      </aside>

      <div className="queue-list">
        {loading ? (
          <div className="surface content-skeleton">Loading action queue…</div>
        ) : null}
        {items.map((item, index) => (
          <article className="surface queue-item" key={item.feedbackId}>
            <div className="queue-priority">
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="queue-item-content">
              <div className="feed-card-meta">
                <span>{item.categoryName}</span>
                <span aria-hidden="true">·</span>
                <time>{item.submittedAt}</time>
                <StatusBadge status={item.status} />
              </div>
              <p>{item.body}</p>
              <div className="queue-item-bottom">
                <span>{item.upCount} employees support this</span>
                <Link
                  className="button button-dark button-small"
                  href={`/manager/feedback/${item.feedbackId}`}
                >
                  Review item
                </Link>
              </div>
            </div>
          </article>
        ))}
        {!loading && items.length === 0 ? (
          <div className="surface empty-state">
            <span className="success-mark" aria-hidden="true">
              ✓
            </span>
            <h2>The queue is clear.</h2>
            <p>Every required-response item has a published next step.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
