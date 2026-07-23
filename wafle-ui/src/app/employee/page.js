"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MoodPicker } from "@/components/mood-picker";
import { useDemoSession } from "@/context/demo-session-context";
import {
  hasCheckedInToday,
  submitMoodCheckIn,
} from "@/lib/mock-wafle-service";

export default function EmployeeHomePage() {
  const { user } = useDemoSession();
  const [mood, setMood] = useState(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    hasCheckedInToday().then((result) => {
      setCheckedIn(result);
      setLoading(false);
    });
  }, []);

  async function handleCheckIn() {
    if (!mood) {
      setMessage("Choose the waffle that best matches your day.");
      return;
    }

    setSaving(true);
    const result = await submitMoodCheckIn(mood);
    setCheckedIn(true);
    setMessage(result.message);
    setSaving(false);
  }

  const firstName = user.displayName.split(" ")[0];

  return (
    <div className="page-stack">
      <header className="page-heading home-heading">
        <div>
          <span className="eyebrow">Employee home</span>
          <h1>Good morning, {firstName}.</h1>
          <p>A quick check-in helps your team see the week more clearly.</p>
        </div>
        <span className="date-pill">Wednesday · July 23</span>
      </header>

      <section className="surface checkin-card">
        <div className="checkin-heading">
          <div>
            <span className="section-kicker">Daily mood check-in</span>
            <h2>How are you feeling today?</h2>
            <p>Choose one. Your answer joins the team trend anonymously.</p>
          </div>
          <span className="privacy-pill">
            <span className="privacy-orbit small" aria-hidden="true" />
            Anonymous
          </span>
        </div>

        {loading ? (
          <div className="content-skeleton">Loading today&apos;s check-in…</div>
        ) : checkedIn ? (
          <div className="success-state" aria-live="polite">
            <span className="success-mark" aria-hidden="true">
              ✓
            </span>
            <div>
              <h3>You&apos;re checked in.</h3>
              <p>
                Thanks for making the team picture a little clearer today.
              </p>
            </div>
          </div>
        ) : (
          <>
            <MoodPicker onChange={setMood} value={mood} />
            <div className="checkin-actions">
              <p
                className={message ? "inline-message visible" : "inline-message"}
                role="status"
              >
                {message || "Your selection stays private."}
              </p>
              <button
                className="button button-primary"
                disabled={saving}
                onClick={handleCheckIn}
                type="button"
              >
                {saving ? "Saving…" : "Submit check-in"}
              </button>
            </div>
          </>
        )}
      </section>

      <div className="two-column-grid">
        <section className="surface action-card">
          <span className="section-kicker">Have something to share?</span>
          <h2>Turn a thought into feedback.</h2>
          <p>
            Choose a topic, explain what is happening, and optionally add how
            it makes you feel.
          </p>
          <Link className="button button-dark" href="/employee/feedback/new">
            Share feedback
          </Link>
        </section>

        <section className="surface loop-card">
          <div className="loop-card-heading">
            <span className="section-kicker">The feedback loop</span>
            <Link className="text-link" href="/employee/responses">
              View responses →
            </Link>
          </div>
          <div className="loop-steps">
            <div>
              <span>1</span>
              <p>Share safely</p>
            </div>
            <i aria-hidden="true" />
            <div>
              <span>2</span>
              <p>Manager responds</p>
            </div>
            <i aria-hidden="true" />
            <div>
              <span>3</span>
              <p>Everyone sees action</p>
            </div>
          </div>
        </section>
      </div>

      <aside className="privacy-callout">
        <span className="privacy-orbit" aria-hidden="true" />
        <div>
          <strong>Your identity and your feedback travel separately.</strong>
          <p>
            Waflé records that you participated without attaching your name to
            what you said.
          </p>
        </div>
        <Link href="/">Learn how it works</Link>
      </aside>
    </div>
  );
}
