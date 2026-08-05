/**
 * The same story, told without the camera.
 *
 * Served during SSR, and kept as the real page for anyone who asks for reduced
 * motion or whose browser cannot give us WebGL. It carries the full narrative —
 * what was said on the call, and what Bylda turned it into — so nothing about
 * the pitch depends on the 3D scene rendering.
 */
import { Link } from "@tanstack/react-router";
import { LandingFooter } from "./CinematicLanding";
import { LandingStyles } from "./landingStyles";
import { BEATS, COPY } from "./story";

/** Splits a transcript line around the phrase Bylda acted on. */
function Quoted({ line, highlight }: { line: string; highlight?: string }) {
  if (!highlight) return <>“{line}”</>;
  const i = line.toLowerCase().indexOf(highlight.toLowerCase());
  if (i < 0) return <>“{line}”</>;
  return (
    <>
      “{line.slice(0, i)}
      <mark>{line.slice(i, i + highlight.length)}</mark>
      {line.slice(i + highlight.length)}”
    </>
  );
}

export function StaticLanding() {
  return (
    <div className="b-root">
      <LandingStyles />

      <section className="b-static-hero">
        <div className="b-static-glow" />
        <div className="b-static-mark" aria-hidden="true" />
        <div className="b-eyebrow">{COPY.eyebrow}</div>
        <h1 className="b-headline">
          <span className="b-line">{COPY.headline[0]}</span>
          <span className="b-line b-line-alt">{COPY.headline[1]}</span>
        </h1>
        <p className="b-sub">{COPY.sub}</p>
        <div className="b-actions">
          <Link to="/demo" className="b-btn b-btn-ghost">
            <span className="b-play" aria-hidden="true" />
            {COPY.secondaryCta.label}
          </Link>
          <Link to="/signup" search={{ plan: undefined }} className="b-btn b-btn-solid">
            {COPY.primaryCta.label}
          </Link>
        </div>
      </section>

      <section className="b-static-section">
        <span className="b-kicker">{COPY.inside.kicker}</span>
        <h2 className="b-static-lead">{COPY.inside.line}</h2>

        <div className="b-static-grid">
          {BEATS.map((beat) => (
            <div key={beat.id} className="b-static-row">
              <p className="b-static-said">
                <Quoted line={beat.said.lines?.[0] ?? ""} highlight={beat.said.highlight} />
              </p>
              <span className="b-static-into" aria-hidden="true">
                →
              </span>
              <div className="b-static-became">
                <strong>{beat.effect}</strong>
                {beat.became.chip && <span className="b-static-chip">{beat.became.chip}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="b-static-section">
        <span className="b-kicker">{COPY.resolve.kicker}</span>
        <h2 className="b-static-lead">{COPY.resolve.headline}</h2>
        <p className="b-sub" style={{ marginInline: 0 }}>
          {COPY.resolve.sub}
        </p>
        <div className="b-actions" style={{ justifyContent: "flex-start" }}>
          <Link to="/demo" className="b-btn b-btn-ghost">
            <span className="b-play" aria-hidden="true" />
            {COPY.secondaryCta.label}
          </Link>
          <Link to="/signup" search={{ plan: undefined }} className="b-btn b-btn-solid">
            {COPY.primaryCta.label}
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
