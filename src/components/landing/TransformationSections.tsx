/**
 * WHAT THE CALL TURNS INTO
 *
 * Five plain scrolling sections, one per thing Bylda pulls out of a sales
 * conversation. Each pairs the line as it was spoken — with the phrase that
 * mattered lit up — against the record it becomes.
 *
 * Deliberately not 3D. This sits in the middle of an existing page and has to
 * read like part of it, so it borrows that page's blue, its near-black grounds
 * and its glow, and reveals on scroll like everything around it.
 */
import { useEffect, useRef } from "react";
import { BEATS, BLUE, STORY_COPY } from "./story";

/** Splits a spoken line around the phrase Bylda acted on. */
function Spoken({ line, highlight }: { line: string; highlight: string }) {
  const i = line.toLowerCase().indexOf(highlight.toLowerCase());
  if (i < 0) return <>“{line}”</>;
  return (
    <>
      “{line.slice(0, i)}
      <mark className="t-mark">{line.slice(i, i + highlight.length)}</mark>
      {line.slice(i + highlight.length)}”
    </>
  );
}

export function TransformationSections() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        gsap.from(".t-head > *", {
          y: 34,
          autoAlpha: 0,
          duration: 0.8,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: { trigger: ".t-head", start: "top 78%" },
        });

        gsap.utils.toArray<HTMLElement>(".t-row").forEach((row) => {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: row, start: "top 74%" },
          });
          tl.from(row.querySelector(".t-said"), {
            x: -34,
            autoAlpha: 0,
            duration: 0.7,
            ease: "power3.out",
          })
            // The highlight sweeps in after the line has landed — the beat is
            // "then Bylda noticed this", not "here is a highlighted sentence".
            .from(
              row.querySelector(".t-mark"),
              { backgroundSize: "0% 100%", duration: 0.5, ease: "power2.out" },
              "-=0.15",
            )
            .from(
              row.querySelector(".t-arrow"),
              { autoAlpha: 0, scale: 0.7, duration: 0.35, ease: "back.out(2)" },
              "-=0.2",
            )
            .from(
              row.querySelector(".t-record"),
              { x: 34, autoAlpha: 0, duration: 0.7, ease: "power3.out" },
              "-=0.25",
            )
            .from(
              row.querySelectorAll(".t-changed"),
              { autoAlpha: 0, y: 8, duration: 0.4, stagger: 0.09, ease: "power2.out" },
              "-=0.35",
            );
        });
      }, root);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section ref={root} className="t-wrap">
      <style>{`
        .t-wrap {
          position: relative;
          background: #02020d;
          padding: clamp(90px, 14vh, 160px) clamp(20px, 6vw, 56px);
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow: hidden;
        }
        .t-glow {
          position: absolute; top: -14%; left: 50%; transform: translateX(-50%);
          width: min(1000px, 120vw); height: 620px; border-radius: 50%; pointer-events: none;
          background: radial-gradient(ellipse, rgba(59,130,246,0.10) 0%, rgba(99,102,241,0.04) 45%, transparent 70%);
        }
        .t-inner { position: relative; max-width: 1120px; margin: 0 auto; }

        .t-head { text-align: center; margin-bottom: clamp(52px, 8vh, 92px); }
        .t-kicker {
          font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
          color: #3b82f6; margin-bottom: 16px;
        }
        .t-title {
          margin: 0 auto; max-width: 18ch;
          font-size: clamp(1.9rem, 4.6vw, 3.2rem); font-weight: 800; letter-spacing: -0.035em;
          line-height: 1.06; color: #f0f4ff; text-wrap: balance;
        }
        .t-sub {
          margin: 18px auto 0; max-width: 56ch; font-size: clamp(0.95rem, 1.6vw, 1.08rem);
          line-height: 1.65; color: rgba(255,255,255,0.42);
        }

        .t-rows { display: flex; flex-direction: column; gap: clamp(16px, 2.6vh, 26px); }

        .t-row {
          display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
          gap: clamp(16px, 3vw, 40px);
          padding: clamp(20px, 3vh, 32px) clamp(20px, 3vw, 36px);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(13,13,38,0.9), rgba(5,5,20,0.9));
        }

        .t-cue {
          font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); margin-bottom: 12px;
        }
        .t-said p {
          margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: clamp(0.84rem, 1.4vw, 0.98rem); line-height: 1.62;
          color: rgba(255,255,255,0.62);
        }
        .t-meta {
          margin-top: 12px; font-size: 11px; letter-spacing: 0.06em;
          color: rgba(255,255,255,0.24);
        }
        /* Painted as a background so it can be swept in from zero width. */
        .t-mark {
          /* The UA stylesheet paints <mark> yellow; only the image is animated,
             so the colour underneath has to be cleared explicitly. */
          background-color: transparent;
          background-image: linear-gradient(rgba(59,130,246,0.28), rgba(59,130,246,0.28));
          background-repeat: no-repeat; background-size: 100% 100%;
          color: #fff; border-radius: 4px;
          padding: 2px 5px; margin: 0 -1px;
          box-decoration-break: clone; -webkit-box-decoration-break: clone;
        }

        .t-arrow {
          display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%;
          border: 1px solid rgba(59,130,246,0.34); background: rgba(59,130,246,0.1);
          color: #3b82f6; font-size: 15px; line-height: 1; flex: none;
        }

        .t-record {
          border-radius: 13px; padding: 16px 18px;
          border: 1px solid rgba(255,255,255,0.09);
          background: linear-gradient(180deg, rgba(20,24,48,0.95), rgba(8,9,24,0.95));
        }
        .t-record-kind {
          display: flex; align-items: center; gap: 7px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
          margin-bottom: 9px;
        }
        .t-record-kind i { width: 6px; height: 6px; border-radius: 50%; }
        .t-record-title {
          margin: 0 0 12px; font-size: clamp(0.98rem, 1.7vw, 1.14rem); font-weight: 700;
          letter-spacing: -0.018em; color: #f0f4ff;
        }
        .t-fields { display: flex; flex-direction: column; gap: 9px; margin-bottom: 13px; }
        .t-field-k {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(255,255,255,0.26); margin-bottom: 3px;
        }
        .t-field-v { font-size: 13.5px; color: rgba(255,255,255,0.76); }
        .t-changed {
          display: inline-block; font-weight: 700; border-radius: 6px;
          padding: 3px 9px; font-size: 13.5px;
        }
        .t-chip {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase;
          border-radius: 999px; padding: 5px 11px;
        }

        .t-closer {
          margin: clamp(56px, 9vh, 100px) auto 0; text-align: center;
          font-size: clamp(1.15rem, 2.6vw, 1.75rem); font-weight: 700; letter-spacing: -0.028em;
          color: #f0f4ff; max-width: 24ch;
        }

        @media (max-width: 780px) {
          .t-row { grid-template-columns: 1fr; gap: 16px; }
          .t-arrow { transform: rotate(90deg); }
        }
      `}</style>

      <div className="t-glow" />

      <div className="t-inner">
        <div className="t-head">
          <div className="t-kicker">{STORY_COPY.kicker}</div>
          <h2 className="t-title">{STORY_COPY.headline}</h2>
          <p className="t-sub">{STORY_COPY.sub}</p>
        </div>

        <div className="t-rows">
          {BEATS.map((beat) => (
            <article key={beat.id} className="t-row">
              <div className="t-said">
                <div className="t-cue">{beat.cue}</div>
                <p>
                  <Spoken line={beat.said} highlight={beat.highlight} />
                </p>
                <div className="t-meta">
                  {beat.speaker} · {beat.time}
                </div>
              </div>

              <div className="t-arrow" aria-hidden="true">
                →
              </div>

              <div className="t-record">
                <div className="t-record-kind" style={{ color: beat.record.accent }}>
                  <i style={{ background: beat.record.accent }} />
                  {beat.record.kind}
                </div>
                <h3 className="t-record-title">{beat.record.title}</h3>
                <div className="t-fields">
                  {beat.record.fields.map((f) => (
                    <div key={f.k}>
                      <div className="t-field-k">{f.k}</div>
                      {f.changed ? (
                        <span
                          className="t-field-v t-changed"
                          style={{
                            color: beat.record.accent,
                            background: `${beat.record.accent}22`,
                            border: `1px solid ${beat.record.accent}55`,
                          }}
                        >
                          {f.v}
                        </span>
                      ) : (
                        <div className="t-field-v">{f.v}</div>
                      )}
                    </div>
                  ))}
                </div>
                <span
                  className="t-chip"
                  style={{
                    color: beat.record.accent,
                    background: `${beat.record.accent}1a`,
                    border: `1px solid ${beat.record.accent}4d`,
                  }}
                >
                  ✓ {beat.record.chip}
                </span>
              </div>
            </article>
          ))}
        </div>

        <p className="t-closer" style={{ borderTop: `1px solid ${BLUE}00` }}>
          {STORY_COPY.closer}
        </p>
      </div>
    </section>
  );
}
