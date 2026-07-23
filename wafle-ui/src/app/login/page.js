"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDemoSession } from "@/context/demo-session-context";

const accounts = [
  {
    role: "employee",
    title: "Employee view",
    description: "Check in, share feedback, and follow responses.",
    email: "employee@wafle.local",
  },
  {
    role: "manager",
    title: "Manager view",
    description: "Review trends, feedback, and the action queue.",
    email: "manager@wafle.local",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, logIn } = useDemoSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(user.role === "manager" ? "/manager" : "/employee");
    }
  }, [isLoading, router, user]);

  async function submitCredentials(nextEmail, nextPassword) {
    setBusy(true);
    setError("");
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    const result = logIn(nextEmail, nextPassword);
    setBusy(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    router.push(result.user.role === "manager" ? "/manager" : "/employee");
  }

  function handleSubmit(event) {
    event.preventDefault();
    submitCredentials(email, password);
  }

  function chooseDemoAccount(account) {
    setEmail(account.email);
    setPassword("demo");
    submitCredentials(account.email, "demo");
  }

  return (
    <main className="auth-shell">
      <div className="auth-brand-column">
        <Link className="brand brand-light" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>Waflé</span>
        </Link>
        <div className="auth-brand-copy">
          <span className="eyebrow eyebrow-light">Safe space, clear next step</span>
          <h1>A little honesty can change the whole recipe.</h1>
          <p>
            Explore the employee and manager sides of a feedback experience
            designed around trust.
          </p>
        </div>
        <div className="auth-privacy-note">
          <span className="privacy-orbit on-dark" aria-hidden="true" />
          <span>
            <strong>Demo only.</strong> No credentials or feedback leave this
            browser.
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
            <p>Use a demo account or enter its details below.</p>
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
            <span>or choose a guided demo</span>
          </div>

          <div className="demo-account-grid">
            {accounts.map((account) => (
              <button
                className="demo-account"
                disabled={busy}
                key={account.role}
                onClick={() => chooseDemoAccount(account)}
                type="button"
              >
                <span className={`demo-account-icon ${account.role}`}>
                  {account.role === "manager" ? "M" : "E"}
                </span>
                <span>
                  <strong>{account.title}</strong>
                  <small>{account.description}</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
