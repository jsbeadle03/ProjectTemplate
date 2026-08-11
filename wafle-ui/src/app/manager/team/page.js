"use client";

import { useCallback, useEffect, useState } from "react";
import { acceptTeamMember, getTeam, removeTeamMember } from "@/lib/wafle-api";
import { MIN_SUBMITTERS } from "@/lib/team";

export default function TeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      getTeam().then((result) => {
        setTeam(result);
        setLoading(false);
      }),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function run(id, action, successMessage) {
    setBusyId(id);
    setMessage("");
    setError("");
    try {
      await action();
      await load();
      setMessage(successMessage);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyId(null);
    }
  }

  const pending = team.filter((member) => member.linkStatus === "pending");
  const accepted = team.filter((member) => member.linkStatus === "accepted");

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Your team</span>
          <h1>Who reports to you.</h1>
          <p>
            People choose you when they sign up. Accept them and their feedback
            reaches your inbox.
          </p>
        </div>
      </header>

      <section className="surface category-card">
        <div className="card-heading-row">
          <div>
            <span className="section-kicker">Waiting on you</span>
            <h2>
              {loading ? "…" : pending.length} request
              {pending.length === 1 ? "" : "s"}
            </h2>
          </div>
        </div>

        {pending.length > 0 ? (
          <div className="category-admin-list">
            {pending.map((member) => (
              <div className="category-admin-row" key={member.id}>
                <strong className="team-name">{member.displayName}</strong>
                <span className="field-hint">Wants to report to you</span>
                <span />
                <div className="category-admin-actions">
                  <button
                    className="button button-dark button-small"
                    disabled={busyId === member.id}
                    onClick={() =>
                      run(
                        member.id,
                        () => acceptTeamMember(member.id),
                        `${member.displayName} accepted.`,
                      )
                    }
                    type="button"
                  >
                    Accept
                  </button>
                  <button
                    className="button button-secondary button-small"
                    disabled={busyId === member.id}
                    onClick={() =>
                      run(
                        member.id,
                        () => removeTeamMember(member.id),
                        `${member.displayName} declined.`,
                      )
                    }
                    type="button"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="field-hint">
            {loading ? "Loading…" : "No one is waiting to join your team."}
          </p>
        )}
      </section>

      <section className="surface category-card">
        <div className="card-heading-row">
          <div>
            <span className="section-kicker">On your team</span>
            <h2>{loading ? "…" : accepted.length} accepted</h2>
          </div>
        </div>

        {accepted.length > 0 ? (
          <div className="category-admin-list">
            {accepted.map((member) => (
              <div className="category-admin-row" key={member.id}>
                <strong className="team-name">{member.displayName}</strong>
                <span />
                <span />
                <div className="category-admin-actions">
                  <button
                    className="button button-secondary button-small"
                    disabled={busyId === member.id}
                    onClick={() =>
                      run(
                        member.id,
                        () => removeTeamMember(member.id),
                        `${member.displayName} removed. Their past feedback stays with you.`,
                      )
                    }
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="field-hint">
            {loading ? "Loading…" : "No one has joined your team yet."}
          </p>
        )}
      </section>

      <aside className="privacy-callout manager-privacy">
        <span className="privacy-orbit" aria-hidden="true" />
        <div>
          <strong>Feedback stays hidden on small teams</strong>
          <p>
            You will not see individual feedback until {MIN_SUBMITTERS} people
            on your team have shared something. Below that, you could work out
            who wrote what.
          </p>
        </div>
      </aside>

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
