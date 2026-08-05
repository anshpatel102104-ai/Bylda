/**
 * THE PAGE
 *
 * The hero is pinned for the entire story, so scrolling never moves the page —
 * it moves the camera. GSAP owns one scrubbed timeline: it writes the master
 * progress that the 3D scene reads, and it drives the DOM copy off the exact
 * same clock, so a caption can never drift from the frame it belongs to.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Scene, type Quality } from "./Scene";
import { resetScrollState, scrollState } from "./scrollState";
import { BEATS, COPY, PHASE, SCROLL_LENGTH, VOID_COLOR } from "./story";
import { LandingStyles } from "./landingStyles";

/** Beat windows, mirrored from the scene so captions land on the same frame. */
const beatWindow = (i: number) => {
  const span = (PHASE.beats[1] - PHASE.beats[0]) / BEATS.length;
  return PHASE.beats[0] + i * span;
};

export function CinematicLanding({ quality }: { quality: Quality }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const [fontsReady, setFontsReady] = useState(false);

  // Card textures are painted to canvas, so the brand faces have to be loaded
  // before the first one is drawn or they bake in a fallback.
  useEffect(() => {
    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        setFontsReady(true);
      }
    };
    const timeout = window.setTimeout(go, 1800);
    document.fonts?.ready.then(go).catch(go);
    return () => window.clearTimeout(timeout);
  }, []);

  // The page is a black room for its whole length.
  useEffect(() => {
    const body = document.body;
    const previous = body.style.backgroundColor;
    body.style.backgroundColor = VOID_COLOR;
    return () => {
      body.style.backgroundColor = previous;
    };
  }, []);

  useEffect(() => {
    resetScrollState();

    const onPointerMove = (e: PointerEvent) => {
      scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      scrollState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let context: { revert: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      // Lag smoothing exists to stop time-based animations jumping after a
      // stall, but this timeline is scrubbed: if the ticker under-reports
      // elapsed time on a slow frame, the copy falls behind the camera and
      // never catches up. Scroll position is the clock here, not wall time.
      gsap.ticker.lagSmoothing(0);

      context = gsap.context(() => {
        gsap.set([".b-hud", ".b-inside", ".b-resolve", ".b-beat"], { autoAlpha: 0 });
        gsap.set(".b-flash", { opacity: 0 });

        // ── Opening: up from black, copy settles in ────────────────────────
        const intro = gsap.timeline({ delay: 0.2 });
        intro
          .to(cover.current, { opacity: 0, duration: 1.2, ease: "power2.inOut" })
          .from(
            [".b-eyebrow", ".b-line", ".b-sub", ".b-actions", ".b-hint"],
            { y: 30, autoAlpha: 0, duration: 0.95, stagger: 0.085, ease: "power3.out" },
            0.35,
          );

        // ── The scroll: one scrubbed timeline, one number ──────────────────
        // The scene reads the *timeline's* progress, not the trigger's, so the
        // camera and the copy share the eased value rather than drifting apart
        // by however much the scrub is currently lagging.
        const tl: gsap.core.Timeline = gsap.timeline({
          defaults: { ease: "none" },
          onUpdate: () => {
            scrollState.p = tl.progress();
          },
          scrollTrigger: {
            trigger: stage.current,
            start: "top top",
            end: `+=${SCROLL_LENGTH * 100}%`,
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        // Spacer keeps the timeline exactly one unit long, so every position
        // below is literally the master progress value.
        tl.to({}, { duration: 1 }, 0);

        tl.to(".b-hint", { autoAlpha: 0, duration: 0.03 }, 0.008);

        // The hero copy is flown through, not faded out.
        tl.to(".b-hero", { autoAlpha: 0, scale: 1.5, filter: "blur(18px)", duration: 0.11 }, 0.05);

        // Crossing the threshold.
        tl.to(".b-flash", { opacity: 0.92, duration: 0.014 }, 0.222);
        tl.to(".b-flash", { opacity: 0, duration: 0.055 }, 0.238);

        // Inside: the session read-out, and the one line that frames it.
        tl.to(".b-hud", { autoAlpha: 1, duration: 0.028 }, 0.284);
        tl.to(".b-inside", { autoAlpha: 1, y: 0, duration: 0.035 }, 0.3);
        tl.to(".b-inside", { autoAlpha: 0, y: -26, duration: 0.03 }, 0.412);

        // One caption pair per transformation.
        BEATS.forEach((_, i) => {
          const start = beatWindow(i);
          tl.to(`.b-beat-${i}`, { autoAlpha: 1, y: 0, duration: 0.02 }, start + 0.012);
          tl.to(`.b-beat-${i}`, { autoAlpha: 0, y: -22, duration: 0.016 }, start + 0.07);
        });

        tl.to(".b-hud", { autoAlpha: 0, duration: 0.025 }, 0.882);
        tl.to(".b-resolve", { autoAlpha: 1, y: 0, duration: 0.04 }, 0.922);

        return () => {
          intro.kill();
          // Back to GSAP's documented default for the rest of the app.
          gsap.ticker.lagSmoothing(500, 33);
        };
      }, root);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("pointermove", onPointerMove);
      context?.revert();
    };
  }, []);

  return (
    <div ref={root} className="b-root">
      <LandingStyles />

      <div ref={stage} className="b-stage">
        {fontsReady && (
          <Canvas
            className="b-canvas"
            style={{ position: "absolute", inset: 0, zIndex: 0 }}
            dpr={[1, quality === "high" ? 2 : 1.4]}
            camera={{ fov: 38, near: 0.1, far: 300, position: [0, 0, 15.5] }}
            gl={{
              antialias: false,
              alpha: false,
              stencil: false,
              powerPreference: "high-performance",
            }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.setClearColor(new THREE.Color(VOID_COLOR), 1);
            }}
          >
            <Scene quality={quality} />
          </Canvas>
        )}

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="b-overlay">
          <div className="b-hero">
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
          </div>

          <div className="b-hint">
            <span>{COPY.scrollHint}</span>
            <span className="b-hint-rail">
              <span className="b-hint-dot" />
            </span>
          </div>

          {/* ── Session read-out ────────────────────────────────────────── */}
          <div className="b-hud">
            <span className="b-hud-dot" />
            <span className="b-hud-label">{COPY.hud.label}</span>
            <span className="b-hud-sep" />
            <span>{COPY.hud.org}</span>
            <span className="b-hud-sep" />
            <span className="b-hud-time">{COPY.hud.duration}</span>
          </div>

          {/* ── Captions ────────────────────────────────────────────────── */}
          <div className="b-captions">
            <div className="b-inside b-caption">
              <span className="b-kicker">{COPY.inside.kicker}</span>
              <span className="b-caption-lead">{COPY.inside.line}</span>
            </div>

            {BEATS.map((beat, i) => (
              <div key={beat.id} className={`b-beat b-beat-${i} b-caption`}>
                <span className="b-caption-cue">{beat.cue}</span>
                <span className="b-caption-arrow" aria-hidden="true" />
                <span className="b-caption-effect">{beat.effect}</span>
              </div>
            ))}
          </div>

          {/* ── Resolve ─────────────────────────────────────────────────── */}
          <div className="b-resolve">
            <div className="b-resolve-scrim" />
            <div className="b-resolve-inner">
              <span className="b-kicker">{COPY.resolve.kicker}</span>
              <h2 className="b-resolve-headline">{COPY.resolve.headline}</h2>
              <p className="b-resolve-sub">{COPY.resolve.sub}</p>
              <div className="b-actions">
                <Link to="/demo" className="b-btn b-btn-ghost">
                  <span className="b-play" aria-hidden="true" />
                  {COPY.secondaryCta.label}
                </Link>
                <Link to="/signup" search={{ plan: undefined }} className="b-btn b-btn-solid">
                  {COPY.primaryCta.label}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="b-flash" />
        <div ref={cover} className="b-cover" />
      </div>

      <LandingFooter />
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="b-footer">
      <div className="b-footer-inner">
        <div className="b-footer-brand">
          <span className="b-footer-mark" aria-hidden="true" />
          <span>Bylda</span>
        </div>
        <nav className="b-footer-links">
          <Link to="/demo">How it works</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/about">About</Link>
          <Link to="/auth/sign-in">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
