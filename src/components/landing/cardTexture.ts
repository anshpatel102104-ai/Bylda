/**
 * CARD TEXTURES
 *
 * Everything floating inside the logo is a real piece of product UI, drawn to a
 * 2D canvas and used as a texture. Canvas beats 3D text here: crisp glyphs at
 * any distance, one draw call per card, full typographic control, and no font
 * fetched from a CDN at runtime.
 */
import * as THREE from "three";
import { ACCENT, type CardSpec } from "./story";

/** UV-space rectangle (origin bottom-left) marking the phrase that matters. */
export type HighlightRect = { x0: number; y0: number; x1: number; y1: number };

export type CardTexture = {
  texture: THREE.CanvasTexture;
  /** World aspect ratio (width / height) of the card. */
  aspect: number;
  highlight: HighlightRect | null;
};

/** Everything below is authored against this width and scaled from it. */
const DESIGN_W = 1024;

/**
 * Height of one label/value row. Tall enough that the next label clears the
 * pill drawn behind a changed value.
 */
const FIELD_ROW = 78;

const SANS = '"Satoshi", "Cabinet Grotesk", -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO = '"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace';

/* ── canvas helpers ───────────────────────────────────────────────────────── */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function rgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** `ctx.letterSpacing` is well supported but not universal — fail soft. */
function setTracking(ctx: CanvasRenderingContext2D, px: number) {
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
  } catch {
    /* older engine: fall back to default tracking */
  }
}

type WordBox = { text: string; x: number; y: number; w: number; marked: boolean };

/**
 * Word-wraps `text` and returns the laid-out boxes so callers can find the
 * pixel bounds of a highlighted phrase after the fact.
 */
function layoutWords(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  highlight?: string,
): { boxes: WordBox[]; endY: number } {
  const words = text.split(/\s+/).filter(Boolean);
  // Mark the token range covered by the highlight phrase.
  let markFrom = -1;
  let markTo = -1;
  if (highlight) {
    const needle = highlight.split(/\s+/).filter(Boolean);
    const norm = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();
    for (let i = 0; i + needle.length <= words.length; i++) {
      if (needle.every((n, j) => norm(words[i + j]) === norm(n))) {
        markFrom = i;
        markTo = i + needle.length - 1;
        break;
      }
    }
  }

  const boxes: WordBox[] = [];
  let cx = x;
  let cy = y;
  const space = ctx.measureText(" ").width;
  words.forEach((word, i) => {
    const w = ctx.measureText(word).width;
    if (cx > x && cx + w > x + maxW) {
      cx = x;
      cy += lineH;
    }
    boxes.push({ text: word, x: cx, y: cy, w, marked: i >= markFrom && i <= markTo });
    cx += w + space;
  });
  return { boxes, endY: cy + lineH };
}

/* ── the card ─────────────────────────────────────────────────────────────── */

/**
 * Paints one card. Height is derived from the content so a two-line transcript
 * does not carry the same dead space as a four-field record.
 */
function paintCard(spec: CardSpec, width: number) {
  const s = width / DESIGN_W;
  const px = (v: number) => v * s;
  const accent = ACCENT[spec.accent];
  const isQuote = spec.kind === "transcript";

  // ── measure pass ────────────────────────────────────────────────────────
  const measure = document.createElement("canvas").getContext("2d")!;
  const pad = px(52);
  const innerW = width - pad * 2;
  let h = pad + px(30); // header row

  const bodySize = isQuote ? px(31) : px(27);
  const bodyFont = isQuote ? `${bodySize}px ${MONO}` : `${bodySize}px ${SANS}`;
  const bodyLineH = isQuote ? px(50) : px(42);
  /** Distance from a line's layout origin down to its baseline. */
  const baselineDrop = bodyLineH * 0.74;

  if (spec.title) h += px(isQuote ? 0 : 54);
  let bodyBoxes: WordBox[] = [];
  if (spec.lines?.length) {
    measure.font = bodyFont;
    h += px(14);
    for (const line of spec.lines) {
      const laid = layoutWords(measure, line, pad, h, innerW, bodyLineH, spec.highlight);
      bodyBoxes = bodyBoxes.concat(laid.boxes);
      h = laid.endY;
    }
  }
  if (spec.fields?.length) h += px(18) + spec.fields.length * FIELD_ROW * s;
  if (spec.chip) h += px(30) + px(52);
  h += pad;

  const height = Math.round(h);

  // ── paint pass ──────────────────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Panel: near-black glass with a cool vertical fall-off.
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "rgba(26, 34, 52, 0.95)");
  bg.addColorStop(1, "rgba(11, 15, 25, 0.96)");
  roundRect(ctx, 1, 1, width - 2, height - 2, px(26));
  ctx.fillStyle = bg;
  ctx.fill();

  // Accent bloom in the top-left corner — the card looks lit, not printed.
  const glow = ctx.createRadialGradient(px(60), px(40), 0, px(60), px(40), width * 0.72);
  glow.addColorStop(0, rgba(accent, 0.16));
  glow.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = glow;
  ctx.fill();

  // Hairline border + top specular edge.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = Math.max(1, px(1.6));
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "rgba(255, 255, 255, 0.11)";
  ctx.fillRect(0, 0, width, Math.max(1, px(1.6)));
  // Left rail in the accent colour.
  ctx.fillStyle = rgba(accent, 0.9);
  ctx.fillRect(0, 0, px(5), height);
  ctx.restore();

  let y = pad + px(22);

  // Header: dot + eyebrow, meta right-aligned.
  ctx.beginPath();
  ctx.arc(pad + px(6), y - px(8), px(7), 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();

  setTracking(ctx, px(3.4));
  ctx.font = `600 ${px(20)}px ${SANS}`;
  ctx.fillStyle = rgba(accent, 0.92);
  ctx.textBaseline = "alphabetic";
  ctx.fillText(spec.eyebrow.toUpperCase(), pad + px(26), y);

  if (spec.meta) {
    ctx.font = `500 ${px(19)}px ${SANS}`;
    ctx.fillStyle = "rgba(244, 245, 251, 0.34)";
    ctx.textAlign = "right";
    ctx.fillText(spec.meta.toUpperCase(), width - pad, y);
    ctx.textAlign = "left";
  }
  setTracking(ctx, 0);
  y += px(30);

  // Title.
  if (spec.title && !isQuote) {
    ctx.font = `700 ${px(36)}px ${SANS}`;
    ctx.fillStyle = "#f4f5fb";
    ctx.fillText(spec.title, pad, y + px(30));
    y += px(54);
  }

  // Body / quote.
  let highlight: HighlightRect | null = null;
  if (spec.lines?.length) {
    ctx.font = bodyFont;
    y += px(14);
    let hx0 = Infinity;
    let hy0 = Infinity;
    let hx1 = -Infinity;
    let hy1 = -Infinity;

    for (const line of spec.lines) {
      const laid = layoutWords(ctx, line, pad, y, innerW, bodyLineH, spec.highlight);
      for (const b of laid.boxes) {
        if (b.marked) {
          // Measured off the baseline, not the line box, so the band sits on
          // the words instead of floating above them.
          const baseline = b.y + baselineDrop;
          hx0 = Math.min(hx0, b.x);
          hy0 = Math.min(hy0, baseline - bodySize * 0.82);
          hx1 = Math.max(hx1, b.x + b.w);
          hy1 = Math.max(hy1, baseline + bodySize * 0.26);
        }
        ctx.fillStyle = b.marked
          ? "#ffffff"
          : isQuote
            ? "rgba(244, 245, 251, 0.68)"
            : "rgba(244, 245, 251, 0.58)";
        ctx.fillText(b.text, b.x, b.y + baselineDrop);
      }
      y = laid.endY;
    }

    if (hx1 > hx0) {
      const bleed = px(10);
      highlight = {
        x0: (hx0 - bleed) / width,
        x1: (hx1 + bleed) / width,
        // Canvas Y grows down, UV grows up.
        y0: 1 - (hy1 + bleed) / height,
        y1: 1 - (hy0 - bleed) / height,
      };
    }
  }

  // Field rows.
  if (spec.fields?.length) {
    y += px(18);
    for (const f of spec.fields) {
      ctx.font = `500 ${px(19)}px ${SANS}`;
      setTracking(ctx, px(2.2));
      ctx.fillStyle = "rgba(244, 245, 251, 0.32)";
      ctx.fillText(f.k.toUpperCase(), pad, y + px(20));
      setTracking(ctx, 0);

      ctx.font = `${f.changed ? 700 : 500} ${px(28)}px ${SANS}`;
      const vw = ctx.measureText(f.v).width;
      if (f.changed) {
        roundRect(ctx, pad - px(11), y + px(28), vw + px(22), px(44), px(10));
        ctx.fillStyle = rgba(accent, 0.16);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, 0.42);
        ctx.lineWidth = Math.max(1, px(1.4));
        ctx.stroke();
      }
      ctx.fillStyle = f.changed ? accent : "rgba(244, 245, 251, 0.82)";
      ctx.fillText(f.v, pad, y + px(59));
      y += FIELD_ROW * s;
    }
  }

  // Outcome chip.
  if (spec.chip) {
    y += px(30);
    ctx.font = `700 ${px(19)}px ${SANS}`;
    setTracking(ctx, px(2.6));
    const label = spec.chip.toUpperCase();
    const cw = ctx.measureText(label).width + px(58);
    roundRect(ctx, pad, y, cw, px(46), px(23));
    ctx.fillStyle = rgba(accent, 0.14);
    ctx.fill();
    ctx.strokeStyle = rgba(accent, 0.4);
    ctx.lineWidth = Math.max(1, px(1.4));
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillText(label, pad + px(42), y + px(31));
    setTracking(ctx, 0);
    // Tick.
    ctx.strokeStyle = accent;
    ctx.lineWidth = px(3);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pad + px(18), y + px(23));
    ctx.lineTo(pad + px(24), y + px(30));
    ctx.lineTo(pad + px(34), y + px(16));
    ctx.stroke();
  }

  return { canvas, highlight };
}

/* ── texture cache ────────────────────────────────────────────────────────── */

const cache = new Map<string, CardTexture>();

export function makeCardTexture(spec: CardSpec, width = 1024): CardTexture {
  const key = `${width}|${JSON.stringify(spec)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { canvas, highlight } = paintCard(spec, width);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  const result: CardTexture = { texture, aspect: canvas.width / canvas.height, highlight };
  cache.set(key, result);
  return result;
}

export function disposeCardTextures() {
  cache.forEach((c) => c.texture.dispose());
  cache.clear();
}

/* ── sprite textures ──────────────────────────────────────────────────────── */

let dotTexture: THREE.CanvasTexture | null = null;

/** Soft round sprite used for dust and the data streams between cards. */
export function makeDotTexture(): THREE.CanvasTexture {
  if (dotTexture) return dotTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  dotTexture = new THREE.CanvasTexture(canvas);
  dotTexture.colorSpace = THREE.SRGBColorSpace;
  return dotTexture;
}

let auraTexture: THREE.CanvasTexture | null = null;

/** Wide falloff used for the light bleeding through the portal. */
export function makeAuraTexture(): THREE.CanvasTexture {
  if (auraTexture) return auraTexture;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.14, "rgba(190,235,255,0.6)");
  g.addColorStop(0.42, "rgba(56,189,248,0.18)");
  g.addColorStop(1, "rgba(56,189,248,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  auraTexture = new THREE.CanvasTexture(canvas);
  auraTexture.colorSpace = THREE.SRGBColorSpace;
  return auraTexture;
}
