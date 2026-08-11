import Link from "next/link";

export const metadata = {
  title: "How your privacy is protected",
};

const privacyPoints = [
  {
    number: "01",
    title: "Your name stays separate",
    copy: "What you submit is stored independently from who submitted it. The two are never joined or displayed together, even internally.",
  },
  {
    number: "02",
    title: "Small groups stay protected",
    copy: "Mood trends and summaries only appear once enough responses exist, so an individual can never be identified by process of elimination.",
  },
  {
    number: "03",
    title: "Managers see feedback, not identities",
    copy: "Managers can read, categorize, and respond to feedback, but the interface never shows them who wrote it.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="landing-page">
      <header className="public-header">
        <Link className="brand" href="/" aria-label="Waflé home">
          <span className="brand-mark" aria-hidden="true" />
          <span>Waflé</span>
        </Link>
        <nav className="public-nav" aria-label="Public navigation">
          <Link href="/">Home</Link>
          <Link className="button button-small button-dark" href="/login">
            Log in
          </Link>
        </nav>
      </header>

      <main>
        <section className="trust-section" id="how-privacy-works">
          <div className="section-heading">
            <span className="eyebrow">How privacy works</span>
            <h2>Your anonymity is protected by design.</h2>
            <p>
              Waflé keeps what you say and who you are on separate paths. Here
              is exactly how that works, so you can trust the system enough to
              be honest.
            </p>
          </div>
          <div className="trust-grid">
            {privacyPoints.map((point) => (
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
            <span className="eyebrow eyebrow-light">Still have questions?</span>
            <h2>Your honesty is safe here.</h2>
          </div>
          <Link className="button button-cream" href="/login">
            Get started
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
