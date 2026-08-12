"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/context/session-context";
import { deleteMyAccount } from "@/lib/wafle-api";

export default function AccountPage() {
  const router = useRouter();
  const user = useSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setBusy(true);
    setError("");
    try {
      await deleteMyAccount();
      router.push("/");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError.message);
      setBusy(false);
    }
  }

  return (
    <div className="page-stack narrow-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Your account</span>
          <h1>{user.displayName}</h1>
          <p>
            Signed in as {user.role === "manager" ? "a manager" : "an employee"}
            .
          </p>
        </div>
      </header>

      <section className="surface action-card">
        <span className="section-kicker">Danger zone</span>
        <h2>Delete your account.</h2>
        <p>
          This removes your account, everything you have shared, your check-ins,
          and your reactions. It cannot be undone.
        </p>
        {user.role === "manager" ? (
          <p className="field-hint">
            Your team will be unlinked and will need to choose a manager again.
            Feedback they sent you is not deleted, but no one will be able to
            act on it.
          </p>
        ) : null}

        {error ? (
          <p className="form-message error" role="alert">
            {error}
          </p>
        ) : null}

        {confirming ? (
          <div className="category-admin-actions">
            <button
              className="button button-primary"
              disabled={busy}
              onClick={handleDelete}
              type="button"
            >
              {busy ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => setConfirming(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="button button-dark"
            onClick={() => setConfirming(true)}
            type="button"
          >
            Delete my account
          </button>
        )}
      </section>
    </div>
  );
}
