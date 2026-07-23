import Link from "next/link";

const trustPoints = [
  {
    number: "01",
    title: "Your name stays separate",
    copy: "Participation is recorded independently from what you share. The two are never shown together.",
  },
  {
    number: "02",
    title: "Small groups stay protected",
    copy: "Team insights only appear when enough people have responded, so no one can be singled out.",
  },
  {
    number: "03",
    title: "Every concern gets a path",
    copy: "Managers can acknowledge feedback, share next steps, and close the loop without knowing who wrote it.",
  },
];

export default function Home() {
  return (
    <div className="landing-page">
      <header className="public-header">
        <Link className="brand" href="/" aria-label="Waflé home">
          <span className="brand-mark" aria-hidden="true" />
          <span>Waflé</span>
        </Link>
        <nav className="public-nav" aria-label="Public navigation">
          <a href="#how-it-works">How it works</a>
          <Link className="button button-small button-dark" href="/login">
            Open demo
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Anonymous input. Accountable action.</span>
            <h1>
              Honest feedback
              <span> belongs at the table.</span>
            </h1>
            <p>
              Waflé gives employees a safe, simple way to share what is working
              and what needs attention—then makes the response visible.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/login">
                Explore the demo
              </Link>
              <a className="text-link" href="#how-it-works">
                See how privacy works <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="trust-signal">
              <span className="trust-icon" aria-hidden="true">
                ✓
              </span>
              No feedback is ever displayed with an employee identity.
            </div>
          </div>

          <div className="hero-preview" aria-label="Mood check-in preview">
            <div className="preview-topline">
              <div>
                <span className="micro-label">TODAY&apos;S CHECK-IN</span>
                <h2>How are you feeling?</h2>
              </div>
              <span className="demo-chip">Private</span>
            </div>
            <p className="preview-copy">
              Choose the waffle that best matches your day.
            </p>
            <div className="preview-moods" aria-hidden="true">
              {[
                ["1", "#C1554E"],
                ["2", "#D77C50"],
                ["3", "#E8B04B"],
                ["4", "#9EAF62"],
                ["5", "#5E9E6E"],
              ].map(([score, color]) => (
                <span
                  className={score === "4" ? "preview-mood active" : "preview-mood"}
                  key={score}
                  style={{ "--mood-color": color }}
                >
                  {score}
                </span>
              ))}
            </div>
            <div className="preview-message">
              <span className="privacy-orbit" aria-hidden="true" />
              <div>
                <strong>Your check-in is anonymous.</strong>
                <span>Managers only see combined team trends.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-section" id="how-it-works">
          <div className="section-heading">
            <span className="eyebrow">Designed for trust</span>
            <h2>Private by structure, not by promise.</h2>
            <p>
              Waflé keeps participation and feedback on separate paths, while
              still giving teams a way to see progress.
            </p>
          </div>
          <div className="trust-grid">
            {trustPoints.map((point) => (
              <article className="trust-card" key={point.number}>
                <span className="trust-number">{point.number}</span>
                <h3>{point.title}</h3>
                <p>{point.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="action-banner">
          <div>
            <span className="eyebrow eyebrow-light">A better feedback loop</span>
            <h2>Say it safely. See what happens next.</h2>
          </div>
          <Link className="button button-cream" href="/login">
            Enter the demo
          </Link>
        </section>
      </main>

      <footer className="public-footer">
        <Link className="brand brand-small" href="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>Waflé</span>
        </Link>
        <p>Built by Team Waffle Stompers · CIS 440</p>
      </footer>
    </div>
  );
}
