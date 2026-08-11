"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/managers")
      .then((res) => (res.ok ? res.json() : []))
      .then(setManagers);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, email, password, role, managerId }),
    });

    if (!res.ok) {
      const { error: message } = await res.json().catch(() => ({}));
      setError(message ?? "Could not create your account.");
      setBusy(false);
      return;
    }

    router.push(role === "manager" ? "/manager" : "/employee");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <div className="auth-brand-column">
        <Link className="brand brand-light" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>Waflé</span>
        </Link>
        <div className="auth-brand-copy">
          <span className="eyebrow eyebrow-light">Join your team</span>
          <h1>Say it safely. See what happens next.</h1>
          <p>
            Create an account to check in on your week and share feedback that
            reaches your manager without your name.
          </p>
        </div>
        <div className="auth-privacy-note">
          <span className="privacy-orbit on-dark" aria-hidden="true" />
          <span>
            <strong>Your account is not your feedback.</strong> Waflé stores
            what you share against a pseudonym generated when you sign up.
          </span>
        </div>
      </div>

      <div className="auth-form-column">
        <div className="auth-card">
          <div className="auth-card-heading">
            <Link className="back-link" href="/">
              <span aria-hidden="true">←</span> Back to overview
            </Link>
            <span className="eyebrow">Create your account</span>
            <h2>Get started</h2>
            <p>You will be signed in as soon as your account is ready.</p>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>I am joining as</span>
              <select
                onChange={(event) => setRole(event.target.value)}
                value={role}
              >
                <option value="employee">An employee</option>
                <option value="manager">A manager</option>
              </select>
            </label>
            {role === "employee" ? (
              <label className="field">
                <span>My manager</span>
                <select
                  onChange={(event) => setManagerId(event.target.value)}
                  required
                  value={managerId}
                >
                  <option value="">Select your manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.displayName}
                    </option>
                  ))}
                </select>
                <small className="field-hint">
                  They will need to accept you before you can share feedback.
                </small>
              </label>
            ) : null}
            <label className="field">
              <span>Your name</span>
              <input
                autoComplete="name"
                maxLength={120}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Alex Morgan"
                required
                type="text"
                value={displayName}
              />
            </label>
            <label className="field">
              <span>Email address</span>
              <input
                autoComplete="username"
                maxLength={255}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
                type="email"
                value={email}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                autoComplete="new-password"
                minLength={10}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 10 characters"
                required
                type="password"
                value={password}
              />
            </label>
            {error ? (
              <p className="form-message error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="button button-primary button-full"
              disabled={busy}
              type="submit"
            >
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="form-divider">
            <span>already have an account?</span>
          </div>

          <Link className="button button-secondary button-full" href="/login">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
