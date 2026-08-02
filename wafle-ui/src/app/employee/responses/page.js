"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { getMyFeedback } from "@/lib/wafle-api";

export default function MyResponsesPage() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyFeedback().then((result) => {
      setResponses(result);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <span className="eyebrow">My responses</span>
          <h1>See how the loop is closing.</h1>
          <p>
            Whether a manager has read what you shared, and any updates they
            have posted back.
          </p>
        </div>
      </header>

      <div className="timeline">
        {loading ? (
          <div className="surface content-skeleton">Loading responses…</div>
        ) : null}
        {responses.map((item) => (
          <article className="surface response-card" key={item.feedbackId}>
            <div className="timeline-marker" aria-hidden="true" />
            <div className="response-card-top">
              <div>
                <span className="section-kicker">{item.categoryName}</span>
                <time>Shared {item.submittedAt}</time>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <blockquote>{item.body}</blockquote>
            <div className="read-status-row">
              {item.isRead ? (
                <span className="read-receipt">
                  <span aria-hidden="true">✓</span>
                  Read by a manager
                  {item.readAt ? ` on ${item.readAt}` : ""}
                </span>
              ) : (
                <span className="read-receipt muted">
                  Not read by a manager yet
                </span>
              )}
            </div>
            {item.response ? (
              <div className="manager-response prominent">
                <span className="response-label">
                  {item.actionType || "Manager response"}
                </span>
                <p>{item.response}</p>
              </div>
            ) : null}
          </article>
        ))}
        {!loading && responses.length === 0 ? (
          <div className="surface empty-state">
            <h2>Nothing shared yet.</h2>
            <p>
              Feedback you share in this session will appear here, along with
              whether a manager has read it.
            </p>
          </div>
        ) : null}
      </div>

      <div className="surface empty-prompt">
        <div>
          <h2>Have another thought?</h2>
          <p>New feedback can be shared at any time.</p>
        </div>
        <Link className="button button-dark" href="/employee/feedback/new">
          Share feedback
        </Link>
      </div>
    </div>
  );
}
