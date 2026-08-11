"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const { error: message } = await res.json().catch(() => ({}));
      setError(message ?? "Could not sign you in.");
      setBusy(false);
      return;
    }

    const user = await res.json();
    router.push(user.role === "manager" ? "/manager" : "/employee");
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
          <span className="eyebrow eyebrow-light">
            Safe space, clear next step
          </span>
          <h1>A little honesty can change the whole recipe.</h1>
          <p>
            Share what is working and what needs attention, without your name
            ever being attached to it.
          </p>
        </div>
        <div className="auth-privacy-note">
          <span className="privacy-orbit on-dark" aria-hidden="true" />
          <span>
            <strong>Private by structure.</strong> Your feedback is stored
            against a pseudonym, never your account.
          </span>
        </div>
      </div>

      <div className="auth-form-column">
        <div className="auth-card">
          <div className="auth-card-heading">
            <Link className="back-link" href="/">
              <span aria-hidden="true">←</span> Back to overview
            </Link>
            <span className="eyebrow">Welcome back</span>
            <h2>Open your workspace</h2>
            <p>Enter the details for your Waflé account.</p>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email address</span>
              <input
                autoComplete="username"
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
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
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
              {busy ? "Opening workspace…" : "Log in"}
            </button>
          </form>

          <div className="form-divider">
            <span>new to Waflé?</span>
          </div>

          <Link
            className="button button-secondary button-full"
            href="/register"
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
