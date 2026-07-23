"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MoodPicker } from "@/components/mood-picker";
import {
  getCategories,
  submitFeedback,
} from "@/lib/mock-wafle-service";

export default function NewFeedbackPage() {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const result = await submitFeedback(categoryId, body, mood);
      setMessage(result.message);
      setBody("");
      setCategoryId("");
      setMood(null);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedCategory = categories.find(
    (item) => item.categoryId === Number(categoryId),
  );

  return (
    <div className="page-stack narrow-page">
      <header className="page-heading">
        <div>
          <Link className="back-link" href="/employee">
            <span aria-hidden="true">←</span> Employee home
          </Link>
          <span className="eyebrow">Share feedback</span>
          <h1>What should your team know?</h1>
          <p>
            Be specific enough to act on, but leave out names or identifying
            details.
          </p>
        </div>
      </header>

      <form className="surface feedback-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-step">1</div>
          <div className="form-section-content">
            <label className="field">
              <span>Choose a topic</span>
              <select
                onChange={(event) => setCategoryId(event.target.value)}
                required
                value={categoryId}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedCategory ? (
              <p className="field-hint">
                {selectedCategory.description}
                {selectedCategory.requiresResponse
                  ? " A manager response is required for this topic."
                  : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div className="form-section">
          <div className="form-step">2</div>
          <div className="form-section-content">
            <label className="field">
              <span>Your feedback</span>
              <textarea
                maxLength={800}
                onChange={(event) => setBody(event.target.value)}
                placeholder="What happened, why does it matter, and what could make it better?"
                required
                rows={7}
                value={body}
              />
            </label>
            <div className="field-meta">
              <span>Minimum 12 characters</span>
              <span>{body.length}/800</span>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-step">3</div>
          <div className="form-section-content">
            <div className="field-label-row">
              <span>How does this make you feel?</span>
              <small>Optional</small>
            </div>
            <MoodPicker compact onChange={setMood} value={mood} />
          </div>
        </div>

        <div className="form-footer">
          <div className="form-privacy">
            <span className="privacy-orbit small" aria-hidden="true" />
            Your name is never attached to this feedback.
          </div>
          <button
            className="button button-primary"
            disabled={saving}
            type="submit"
          >
            {saving ? "Sharing…" : "Share anonymously"}
          </button>
        </div>

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
      </form>
    </div>
  );
}
