"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { changeMyManager, getManagers } from "@/lib/wafle-api";

export function PendingApproval() {
  const router = useRouter();
  const [managers, setManagers] = useState([]);
  const [managerId, setManagerId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getManagers().then(setManagers);
  }, []);

  async function handleSwitch(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await changeMyManager(managerId);
      router.refresh();
    } catch (switchError) {
      setError(switchError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack narrow-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Almost there</span>
          <h1>Waiting on your manager.</h1>
          <p>
            You will be able to check in and share feedback as soon as they
            accept you.
          </p>
        </div>
      </header>

      <section className="surface action-card">
        <span className="privacy-orbit" aria-hidden="true" />
        <h2>Nothing you share is visible yet.</h2>
        <p>
          Feedback is routed to the manager who accepts you, so there is nowhere
          for it to go until then. Refresh this page once they have.
        </p>
      </section>

      <form className="surface action-card" onSubmit={handleSwitch}>
        <span className="section-kicker">Chose the wrong person?</span>
        <h2>Pick a different manager.</h2>
        <label className="field">
          <span>Manager</span>
          <select
            onChange={(event) => setManagerId(event.target.value)}
            required
            value={managerId}
          >
            <option value="">Select a manager</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.displayName}
              </option>
            ))}
          </select>
        </label>
        {error ? (
          <p className="form-message error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="button button-dark" disabled={busy} type="submit">
          {busy ? "Saving…" : "Request this manager"}
        </button>
      </form>
    </div>
  );
}
