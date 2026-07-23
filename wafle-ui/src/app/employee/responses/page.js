"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { getMyResponses } from "@/lib/mock-wafle-service";

export default function MyResponsesPage() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyResponses().then((result) => {
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
            Manager updates connected to feedback you shared during this demo
            session.
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
            <div className="manager-response prominent">
              <span className="response-label">{item.actionType}</span>
              <p>{item.response}</p>
            </div>
          </article>
        ))}
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
