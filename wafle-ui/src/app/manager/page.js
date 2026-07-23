"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/mock-wafle-service";

export default function ManagerDashboardPage() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    getDashboard().then(setDashboard);
  }, []);

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
        <label className="compact-field period-field">
          <span>Reporting period</span>
          <select defaultValue="14">
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
      </header>

      <section className="metric-grid" aria-label="Team metrics">
        <article className="surface metric-card metric-featured">
          <div className="metric-topline">
            <span>Average mood</span>
            <span className="metric-change positive">
              {dashboard.moodChange}
            </span>
          </div>
          <strong>{dashboard.avgMood}</strong>
          <div className="mood-scale" aria-label="3.9 out of 5">
            {[1, 2, 3, 4, 5].map((value) => (
              <i
                className={value <= 4 ? "filled" : ""}
                key={value}
                aria-hidden="true"
              />
            ))}
          </div>
          <small>out of 5 · trending upward</small>
        </article>
        <article className="surface metric-card">
          <span>Participation</span>
          <strong>{dashboard.participationRate}%</strong>
          <small>
            {dashboard.participatingUsers} of {dashboard.eligibleUsers} eligible
            employees
          </small>
        </article>
        <article className="surface metric-card">
          <span>Open feedback</span>
          <strong>{dashboard.openFeedback}</strong>
          <small>3 items require a response</small>
        </article>
        <article className="surface metric-card">
          <span>Response rate</span>
          <strong>{dashboard.responseRate}%</strong>
          <small>within the team&apos;s target window</small>
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
        </section>
      </div>

      <div className="manager-lower-grid">
        <aside className="privacy-callout manager-privacy">
          <span className="privacy-orbit" aria-hidden="true" />
          <div>
            <strong>Privacy guardrail active</strong>
            <p>{dashboard.privacyNotice}</p>
          </div>
        </aside>
        <section className="surface queue-teaser">
          <div>
            <span className="section-kicker">Action queue</span>
            <h2>3 responses need attention.</h2>
          </div>
          <Link className="button button-dark" href="/manager/action-queue">
            Open queue
          </Link>
        </section>
      </div>
    </div>
  );
}
