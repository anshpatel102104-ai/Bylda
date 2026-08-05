/**
 * Styles for the landing experience — cinematic and reduced-motion alike.
 *
 * Kept as one scoped stylesheet rather than inline style objects: the design
 * leans on fluid clamps, gradient text, blend modes and media queries, none of
 * which survive being flattened into React style props.
 */
export function LandingStyles() {
  return (
    <style>{`
    .b-root {
      --b-void: #04050b;
      --b-ink: #f4f5fb;
      --b-sky: #38bdf8;
      --b-gold: #fbbf24;
      --b-dim: rgba(244, 245, 251, 0.56);
      --b-faint: rgba(244, 245, 251, 0.32);
      --b-hair: rgba(255, 255, 255, 0.12);
      background: var(--b-void);
      color: var(--b-ink);
      font-family: "Satoshi", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    .b-stage {
      position: relative;
      width: 100%;
      height: 100vh;
      height: 100svh;
      overflow: hidden;
      background: var(--b-void);
    }

    .b-overlay {
      position: absolute;
      inset: 0;
      z-index: 10;
      pointer-events: none;
    }

    .b-flash {
      position: absolute;
      inset: 0;
      z-index: 20;
      background: radial-gradient(circle at 50% 50%, #ffffff 0%, #cbe9ff 45%, #38bdf8 100%);
      opacity: 0;
      pointer-events: none;
    }

    .b-cover {
      position: absolute;
      inset: 0;
      z-index: 30;
      background: var(--b-void);
      pointer-events: none;
    }

    /* ── Hero ───────────────────────────────────────────────────────────── */

    .b-hero {
      position: absolute;
      left: 0;
      right: 0;
      bottom: clamp(96px, 11vh, 136px);
      margin-inline: auto;
      width: min(920px, 88vw);
      text-align: center;
      transform-origin: 50% 60%;
      will-change: transform, opacity, filter;
    }

    .b-eyebrow {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.44em;
      text-transform: uppercase;
      color: var(--b-sky);
      margin-bottom: clamp(14px, 2vh, 22px);
    }

    .b-headline {
      margin: 0;
      font-family: "Cabinet Grotesk", "Satoshi", sans-serif;
      font-size: clamp(2.5rem, 7.4vw, 6.1rem);
      font-weight: 800;
      letter-spacing: -0.045em;
      line-height: 0.96;
    }

    .b-line { display: block; }

    /* Second line reads as polished metal, echoing the mark above it. */
    .b-line-alt {
      background: linear-gradient(96deg, #ffffff 0%, #a9cce3 30%, #ffffff 55%, #9cc6e0 78%, #ffffff 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }

    .b-sub {
      margin: clamp(18px, 2.6vh, 30px) auto 0;
      max-width: 640px;
      font-size: clamp(0.94rem, 1.5vw, 1.1rem);
      line-height: 1.62;
      color: var(--b-dim);
    }

    /* ── Buttons ────────────────────────────────────────────────────────── */

    .b-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
      margin-top: clamp(24px, 3.4vh, 38px);
      pointer-events: auto;
    }

    .b-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 0.92rem 1.7rem;
      border-radius: 12px;
      font-size: 0.94rem;
      font-weight: 600;
      letter-spacing: -0.005em;
      text-decoration: none;
      transition:
        transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
        background 0.24s ease,
        border-color 0.24s ease,
        box-shadow 0.24s ease;
    }

    .b-btn:hover { transform: translateY(-2px); }

    .b-btn-solid {
      background: var(--b-ink);
      color: #060a14;
      border: 1px solid transparent;
      box-shadow: 0 10px 40px rgba(180, 214, 255, 0.16);
    }

    .b-btn-solid:hover {
      background: #ffffff;
      box-shadow: 0 14px 54px rgba(56, 189, 248, 0.28);
    }

    .b-btn-ghost {
      background: rgba(255, 255, 255, 0.04);
      color: var(--b-ink);
      border: 1px solid var(--b-hair);
      backdrop-filter: blur(12px);
    }

    .b-btn-ghost:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(56, 189, 248, 0.42);
    }

    .b-play {
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 5px 0 5px 8px;
      border-color: transparent transparent transparent currentColor;
    }

    /* ── Scroll hint ────────────────────────────────────────────────────── */

    .b-hint {
      position: absolute;
      left: 0;
      right: 0;
      bottom: clamp(14px, 2vh, 26px);
      margin-inline: auto;
      width: max-content;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      font-size: 0.62rem;
      font-weight: 600;
      letter-spacing: 0.36em;
      text-transform: uppercase;
      color: var(--b-faint);
    }

    .b-hint-rail {
      position: relative;
      display: block;
      width: 1px;
      height: 42px;
      background: linear-gradient(180deg, var(--b-hair), transparent);
      overflow: hidden;
    }

    .b-hint-dot {
      position: absolute;
      inset-inline: -1px;
      height: 12px;
      background: var(--b-sky);
      animation: b-fall 2.2s cubic-bezier(0.6, 0, 0.4, 1) infinite;
    }

    @keyframes b-fall {
      0% { transform: translateY(-14px); opacity: 0; }
      35% { opacity: 1; }
      100% { transform: translateY(44px); opacity: 0; }
    }

    /* ── Session read-out ───────────────────────────────────────────────── */

    .b-hud {
      position: absolute;
      top: clamp(20px, 3.6vh, 40px);
      left: clamp(20px, 4vw, 52px);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 15px;
      border: 1px solid var(--b-hair);
      border-radius: 999px;
      background: rgba(8, 12, 22, 0.55);
      backdrop-filter: blur(14px);
      font-size: 0.66rem;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--b-dim);
    }

    .b-hud-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 10px #34d399;
      animation: b-pulse 2s ease-in-out infinite;
    }

    .b-hud-label { color: var(--b-ink); font-weight: 600; }
    .b-hud-sep { width: 1px; height: 11px; background: var(--b-hair); }
    .b-hud-time { font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: 0.06em; }

    @keyframes b-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.35; }
    }

    /* ── Captions ───────────────────────────────────────────────────────── */

    .b-captions {
      position: absolute;
      left: 0;
      right: 0;
      bottom: clamp(48px, 11vh, 120px);
      display: grid;
      justify-items: center;
      padding-inline: 6vw;
    }

    .b-caption {
      grid-area: 1 / 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
      max-width: 620px;
    }

    .b-kicker {
      font-size: 0.63rem;
      font-weight: 600;
      letter-spacing: 0.36em;
      text-transform: uppercase;
      color: var(--b-sky);
    }

    .b-caption-lead {
      font-family: "Cabinet Grotesk", "Satoshi", sans-serif;
      font-size: clamp(1.3rem, 3vw, 2.1rem);
      font-weight: 700;
      letter-spacing: -0.035em;
      line-height: 1.15;
    }

    .b-caption-cue {
      font-size: clamp(0.9rem, 1.7vw, 1.12rem);
      font-weight: 500;
      color: var(--b-dim);
    }

    .b-caption-arrow {
      width: 1px;
      height: 20px;
      background: linear-gradient(180deg, transparent, var(--b-sky));
      position: relative;
    }

    .b-caption-arrow::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: -3px;
      border-style: solid;
      border-width: 5px 3.5px 0 3.5px;
      border-color: var(--b-sky) transparent transparent transparent;
    }

    .b-caption-effect {
      font-family: "Cabinet Grotesk", "Satoshi", sans-serif;
      font-size: clamp(1.15rem, 2.6vw, 1.85rem);
      font-weight: 700;
      letter-spacing: -0.032em;
      line-height: 1.2;
    }

    /* ── Resolve ────────────────────────────────────────────────────────── */

    .b-resolve {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .b-resolve-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 34%, rgba(4, 5, 11, 0.82) 74%, rgba(4, 5, 11, 0.97) 100%);
    }

    .b-resolve-inner {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      text-align: center;
      padding: 0 6vw clamp(40px, 8vh, 90px);
      max-width: 720px;
    }

    .b-resolve-headline {
      margin: 0;
      font-family: "Cabinet Grotesk", "Satoshi", sans-serif;
      font-size: clamp(1.9rem, 5vw, 3.6rem);
      font-weight: 800;
      letter-spacing: -0.042em;
      line-height: 1.02;
    }

    .b-resolve-sub {
      margin: 0;
      font-size: clamp(0.9rem, 1.5vw, 1.06rem);
      line-height: 1.6;
      color: var(--b-dim);
      max-width: 560px;
    }

    /* ── Footer ─────────────────────────────────────────────────────────── */

    .b-footer {
      position: relative;
      z-index: 2;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      background: var(--b-void);
    }

    .b-footer-inner {
      max-width: 1180px;
      margin: 0 auto;
      padding: 30px clamp(20px, 5vw, 48px);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }

    .b-footer-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }

    .b-footer-mark {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 1px solid rgba(56, 189, 248, 0.4);
      background: radial-gradient(circle at 68% 30%, var(--b-gold) 0 3px, transparent 3px),
        linear-gradient(180deg, rgba(56, 189, 248, 0.28), rgba(56, 189, 248, 0.05));
    }

    .b-footer-links {
      display: flex;
      flex-wrap: wrap;
      gap: clamp(16px, 3vw, 32px);
      font-size: 0.85rem;
    }

    .b-footer-links a {
      color: var(--b-faint);
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .b-footer-links a:hover { color: var(--b-ink); }

    /* ── Reduced-motion / no-WebGL fallback ─────────────────────────────── */

    .b-static-hero {
      position: relative;
      min-height: 92vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: clamp(80px, 12vh, 140px) 6vw clamp(60px, 9vh, 110px);
      overflow: hidden;
    }

    .b-static-glow {
      position: absolute;
      top: -18%;
      left: 50%;
      transform: translateX(-50%);
      width: min(1100px, 130vw);
      aspect-ratio: 1;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.14) 0%, rgba(56, 189, 248, 0.04) 42%, transparent 68%);
      pointer-events: none;
    }

    /* A flat stand-in for the 3D mark: the aperture, the sun, the island. */
    .b-static-mark {
      position: relative;
      width: clamp(84px, 12vw, 128px);
      aspect-ratio: 1;
      margin-bottom: clamp(28px, 4vh, 48px);
      border-radius: 26%;
      border: 2px solid transparent;
      background:
        linear-gradient(var(--b-void), var(--b-void)) padding-box,
        linear-gradient(150deg, #ffffff, #7fb6d6 40%, #2a3444 62%, #ffffff 100%) border-box;
      box-shadow: 0 0 60px rgba(56, 189, 248, 0.18);
    }

    .b-static-mark::before,
    .b-static-mark::after {
      content: "";
      position: absolute;
    }

    .b-static-mark::before {
      top: 22%;
      right: 22%;
      width: 24%;
      aspect-ratio: 1;
      border-radius: 50%;
      background: linear-gradient(160deg, #ffe6ad, var(--b-gold));
      box-shadow: 0 0 22px rgba(251, 191, 36, 0.5);
    }

    .b-static-mark::after {
      left: 16%;
      bottom: 27%;
      width: 62%;
      height: 16%;
      border-radius: 999px 999px 4px 4px;
      background: linear-gradient(180deg, #eaf6ff, #7fb6d6);
    }

    .b-static-section {
      max-width: 1080px;
      margin: 0 auto;
      padding: clamp(60px, 10vh, 110px) 6vw;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .b-static-lead {
      font-family: "Cabinet Grotesk", "Satoshi", sans-serif;
      font-size: clamp(1.6rem, 4vw, 2.6rem);
      font-weight: 700;
      letter-spacing: -0.038em;
      line-height: 1.14;
      margin: 14px 0 0;
      max-width: 620px;
    }

    .b-static-grid {
      display: grid;
      gap: 14px;
      margin-top: clamp(34px, 5vh, 54px);
    }

    .b-static-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: clamp(14px, 3vw, 30px);
      padding: clamp(18px, 2.6vh, 26px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(15, 20, 33, 0.7), rgba(6, 8, 15, 0.7));
    }

    .b-static-said {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: clamp(0.8rem, 1.4vw, 0.94rem);
      line-height: 1.55;
      color: var(--b-dim);
    }

    .b-static-said mark {
      background: rgba(56, 189, 248, 0.16);
      color: var(--b-ink);
      padding: 1px 4px;
      border-radius: 4px;
    }

    .b-static-into {
      color: var(--b-sky);
      font-size: 1.1rem;
      line-height: 1;
    }

    .b-static-became {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .b-static-became strong {
      font-size: clamp(0.98rem, 1.7vw, 1.14rem);
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .b-static-chip {
      align-self: flex-start;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--b-sky);
      border: 1px solid rgba(56, 189, 248, 0.34);
      background: rgba(56, 189, 248, 0.1);
      border-radius: 999px;
      padding: 5px 11px;
    }

    @media (max-width: 720px) {
      .b-static-row { grid-template-columns: 1fr; }
      .b-static-into { transform: rotate(90deg); width: max-content; }
      .b-hud { font-size: 0.58rem; padding: 7px 12px; gap: 7px; }
      .b-actions { flex-direction: column; align-items: stretch; }
      .b-btn { justify-content: center; }
    }

    @media (prefers-reduced-motion: reduce) {
      .b-hint-dot, .b-hud-dot { animation: none; }
      .b-btn { transition: none; }
    }
  `}</style>
  );
}
