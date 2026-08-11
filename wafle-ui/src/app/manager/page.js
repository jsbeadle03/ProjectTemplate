"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getDashboard,
  getPendingResponses,
  updateCategory,
} from "@/lib/wafle-api";

const EMPTY_DRAFT = { name: "", description: "", requiresResponse: false };

export default function ManagerDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [categories, setCategories] = useState([]);
  const [pendingCount, setPendingCount] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [busyCategoryId, setBusyCategoryId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // Bumped after every save so the category inputs remount from server state,
  // and a rejected edit cannot leave a value on screen that was never stored.
  const [revision, setRevision] = useState(0);

  const loadCategories = useCallback(() => getCategories().then(setCategories), []);

  useEffect(() => {
    getDashboard().then(setDashboard).catch(() => setDashboard(null));
    loadCategories();
    getPendingResponses().then((items) => setPendingCount(items.length));
  }, [loadCategories]);

  async function run(categoryId, action, successMessage) {
    setBusyCategoryId(categoryId);
    setMessage("");
    setError("");
    try {
      await action();
      await loadCategories();
      setMessage(successMessage);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyCategoryId(null);
      setRevision((current) => current + 1);
    }
  }

  function handleSave(event, category) {
    event.preventDefault();
    const form = new FormData(event.target);
    run(
      category.categoryId,
      () =>
        updateCategory(category.categoryId, {
          name: form.get("name").trim(),
          description: form.get("description").trim(),
          requiresResponse: form.get("requiresResponse") === "on",
        }),
      `${category.name} updated.`,
    );
  }

  function handleCreate(event) {
    event.preventDefault();
    run(
      "new",
      async () => {
        await createCategory(draft);
        setDraft(EMPTY_DRAFT);
      },
      `${draft.name} added.`,
    );
  }

  if (!dashboard) {
    return (
      <div className="page-stack">
        <div className="surface content-skeleton">Loading team overview…</div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="page-heading home-heading">
        <div>
          <span className="eyebrow">Manager dashboard</span>
          <h1>Your team, at a glance.</h1>
          <p>
            Anonymous signals from the last 14 days, grouped to protect
            individual voices.
          </p>
        </div>
      </header>

      <section className="metric-grid" aria-label="Team metrics">
        <article className="surface metric-card metric-featured">
          <div className="metric-topline">
            <span>Average mood</span>
            {dashboard.moodChange ? (
              <span className="metric-change positive">
                {dashboard.moodChange}
              </span>
            ) : null}
          </div>
          <strong>{dashboard.avgMood ?? "—"}</strong>
          {dashboard.avgMood ? (
            <div
              className="mood-scale"
              aria-label={`${dashboard.avgMood} out of 5`}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <i
                  className={value <= Math.round(dashboard.avgMood) ? "filled" : ""}
                  key={value}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : null}
          <small>
            {dashboard.avgMood
              ? `out of 5 · ${dashboard.participants} people checked in`
              : "Not enough check-ins yet"}
          </small>
        </article>
        <article className="surface metric-card">
          <span>Participation</span>
          <strong>{dashboard.participationRate}%</strong>
          <small>
            {dashboard.participants} of {dashboard.eligibleUsers} employees
          </small>
        </article>
        <article className="surface metric-card">
          <span>Open feedback</span>
          <strong>{dashboard.openFeedback}</strong>
          <small>
            {pendingCount === null ? "…" : pendingCount} require a response
          </small>
        </article>
        <article className="surface metric-card">
          <span>Response rate</span>
          <strong>{dashboard.responseRate}%</strong>
          <small>of all feedback has a published reply</small>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="surface chart-card">
          <div className="card-heading-row">
            <div>
              <span className="section-kicker">Team mood</span>
              <h2>Seven-day trend</h2>
            </div>
            <span className="chart-legend">
              <i aria-hidden="true" />
              Average mood
            </span>
          </div>
          {dashboard.moodTrend.length > 0 ? (
            <div className="trend-chart">
              {dashboard.moodTrend.map((point) => (
                <div className="chart-column" key={point.day}>
                  <span>{point.value}</span>
                  <div className="bar-track">
                    <i style={{ height: `${point.value * 18}%` }} />
                  </div>
                  <small>{point.day}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="field-hint">
              No check-ins to chart yet. The trend appears once the team starts
              checking in.
            </p>
          )}
        </section>

        <section className="surface category-card">
          <div className="card-heading-row">
            <div>
              <span className="section-kicker">Feedback mix</span>
              <h2>Top categories</h2>
            </div>
            <Link className="text-link" href="/manager/feedback">
              View all →
            </Link>
          </div>
          {dashboard.categories.length > 0 ? (
            <div className="category-bars">
              {dashboard.categories.map((category) => (
                <div className="category-bar" key={category.name}>
                  <div>
                    <span>{category.name}</span>
                    <strong>{category.count}</strong>
                  </div>
                  <i>
                    <span style={{ width: `${category.percentage}%` }} />
                  </i>
                </div>
              ))}
            </div>
          ) : (
            <p className="field-hint">No feedback has been shared yet.</p>
          )}
        </section>
      </div>

      <section className="surface category-card">
        <div className="card-heading-row">
          <div>
            <span className="section-kicker">Categories</span>
            <h2>What can people give feedback on?</h2>
          </div>
        </div>

        <div className="category-admin-list">
          {categories.map((category) => (
            <form
              className="category-admin-row"
              key={`${category.categoryId}-${revision}`}
              onSubmit={(event) => handleSave(event, category)}
            >
              <input
                aria-label={`${category.name} name`}
                className="category-admin-name"
                defaultValue={category.name}
                disabled={busyCategoryId === category.categoryId}
                maxLength={100}
                name="name"
                required
              />
              <input
                aria-label={`${category.name} description`}
                className="category-admin-description"
                defaultValue={category.description}
                disabled={busyCategoryId === category.categoryId}
                maxLength={255}
                name="description"
                placeholder="Add a short description"
              />
              <label className="category-admin-toggle">
                <input
                  defaultChecked={category.requiresResponse}
                  disabled={busyCategoryId === category.categoryId}
                  name="requiresResponse"
                  type="checkbox"
                />
                <span>Needs a reply</span>
              </label>
              <div className="category-admin-actions">
                <button
                  className="button button-secondary button-small"
                  disabled={busyCategoryId === category.categoryId}
                  type="submit"
                >
                  Save
                </button>
                <button
                  className="button button-secondary button-small"
                  disabled={busyCategoryId === category.categoryId}
                  onClick={() =>
                    run(
                      category.categoryId,
                      () => deleteCategory(category.categoryId),
                      `${category.name} deleted.`,
                    )
                  }
                  type="button"
                >
                  Delete
                </button>
              </div>
            </form>
          ))}
        </div>

        <form className="category-admin-row category-admin-new" onSubmit={handleCreate}>
          <input
            aria-label="New category name"
            className="category-admin-name"
            maxLength={100}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="New category"
            required
            value={draft.name}
          />
          <input
            aria-label="New category description"
            className="category-admin-description"
            maxLength={255}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
            placeholder="Add a short description"
            value={draft.description}
          />
          <label className="category-admin-toggle">
            <input
              checked={draft.requiresResponse}
              onChange={(event) =>
                setDraft({ ...draft, requiresResponse: event.target.checked })
              }
              type="checkbox"
            />
            <span>Needs a reply</span>
          </label>
          <button
            className="button button-dark button-small"
            disabled={busyCategoryId === "new"}
            type="submit"
          >
            Add
          </button>
        </form>

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
      </section>

      <div className="manager-lower-grid">
        {dashboard.privacyNotice ? (
          <aside className="privacy-callout manager-privacy">
            <span className="privacy-orbit" aria-hidden="true" />
            <div>
              <strong>Privacy guardrail active</strong>
              <p>{dashboard.privacyNotice}</p>
            </div>
          </aside>
        ) : null}
        <section className="surface queue-teaser">
          <div>
            <span className="section-kicker">Action queue</span>
            <h2>
              {pendingCount === null ? "…" : pendingCount} responses need
              attention.
            </h2>
          </div>
          <Link className="button button-dark" href="/manager/action-queue">
            Open queue
          </Link>
        </section>
      </div>
    </div>
  );
}
