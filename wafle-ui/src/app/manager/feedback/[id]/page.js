"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  acknowledgeFeedback,
  getFeedbackDetail,
  respondToFeedback,
} from "@/lib/mock-wafle-service";

export default function FeedbackDetailPage() {
  const params = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionType, setActionType] = useState("Investigating");
  const [responseText, setResponseText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFeedbackDetail(params.id).then((result) => {
      setItem(result);
      setLoading(false);
    });
  }, [params.id]);

  async function handleAcknowledge() {
    setSaving(true);
    const updated = await acknowledgeFeedback(item.feedbackId);
    setItem(updated);
    setMessage("Feedback acknowledged. The employee view now shows this status.");
    setSaving(false);
  }

  async function handleResponse(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await respondToFeedback(
        item.feedbackId,
        actionType,
        responseText,
      );
      setItem(updated);
      setMessage("Response posted to the anonymous feedback thread.");
      setResponseText("");
    } catch (responseError) {
      setError(responseError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="surface content-skeleton">Loading feedback detail…</div>
    );
  }

  if (!item) {
    return (
      <div className="surface empty-state">
        <h1>Feedback not found.</h1>
        <Link className="button button-dark" href="/manager/feedback">
          Return to feedback
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack narrow-page">
      <header className="page-heading">
        <div>
          <Link className="back-link" href="/manager/feedback">
            <span aria-hidden="true">←</span> Feedback inbox
          </Link>
          <span className="eyebrow">Feedback #{item.feedbackId}</span>
          <h1>Review and close the loop.</h1>
        </div>
        <StatusBadge status={item.status} />
      </header>

      <article className="surface detail-card">
        <div className="detail-meta">
          <div>
            <span className="section-kicker">Category</span>
            <strong>{item.categoryName}</strong>
          </div>
          <div>
            <span className="section-kicker">Submitted</span>
            <strong>{item.submittedAt}</strong>
          </div>
          <div>
            <span className="section-kicker">Community signal</span>
            <strong>{item.upCount} supports</strong>
          </div>
        </div>
        <blockquote>{item.body}</blockquote>
        <aside className="identity-warning">
          <span className="privacy-orbit small" aria-hidden="true" />
          Employee identity is intentionally unavailable for this feedback.
        </aside>
      </article>

      {item.response ? (
        <section className="surface existing-response">
          <span className="section-kicker">Published response</span>
          <h2>{item.actionType}</h2>
          <p>{item.response}</p>
        </section>
      ) : (
        <section className="surface response-form-card">
          <div className="card-heading-row">
            <div>
              <span className="section-kicker">Manager response</span>
              <h2>What happens next?</h2>
            </div>
            {item.status === "New" ? (
              <button
                className="button button-secondary button-small"
                disabled={saving}
                onClick={handleAcknowledge}
                type="button"
              >
                Acknowledge first
              </button>
            ) : null}
          </div>

          <form className="form-stack" onSubmit={handleResponse}>
            <label className="field">
              <span>Action</span>
              <select
                onChange={(event) => setActionType(event.target.value)}
                value={actionType}
              >
                <option>Investigating</option>
                <option>Will do</option>
                <option>Won&apos;t do</option>
              </select>
            </label>
            <label className="field">
              <span>Response</span>
              <textarea
                onChange={(event) => setResponseText(event.target.value)}
                placeholder="Explain the next step, owner, and expected timing."
                required
                rows={5}
                value={responseText}
              />
            </label>
            <div className="response-form-footer">
              <span>This response will be visible on the feedback wall.</span>
              <button
                className="button button-primary"
                disabled={saving}
                type="submit"
              >
                {saving ? "Posting…" : "Post response"}
              </button>
            </div>
          </form>
        </section>
      )}

      {message ? (
        <p className="form-message success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-message error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
