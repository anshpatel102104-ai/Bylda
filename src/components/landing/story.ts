/**
 * Shared constants for the landing entry sequence and the transformation
 * sections beneath it.
 */

/** Palette borrowed from the landing page's own blue, so the intro hands off
 *  into it without a colour shift. */
export const BLUE = "#3b82f6";
export const INDIGO = "#6366f1";
export const CYAN = "#06b6d4";
export const GOLD = "#fbbf24";
export const VOID_COLOR = "#000000";

/* ── The intro timeline ───────────────────────────────────────────────────── */

/**
 * Phase windows across the pinned intro, 0 → 1. Short on purpose: this is a
 * doorway, not a feature. Everything after it scrolls normally.
 */
export const INTRO = {
  /** The logo, head-on and still. Reads as the mark before it reads as a place. */
  hold: [0.0, 0.2],
  /** Falling toward the opening. The sun lifts and the island drops. */
  dive: [0.2, 0.54],
  /** Down the inside of the badge. */
  tunnel: [0.54, 0.88],
  /** Out the far end, into the page. */
  exit: [0.88, 1.0],
} as const;

/** Pinned scroll distance for the intro, as a multiple of viewport height. */
export const INTRO_LENGTH = 1.6;

/** Camera Z against intro progress. The mouth of the tunnel sits at z = 0. */
export const CAMERA_KEYS: [progress: number, z: number][] = [
  [0.0, 11.5],
  [0.2, 10.2],
  [0.4, 4.6],
  [0.54, -0.6],
  [0.88, -13.2],
  [1.0, -17],
];

/* ── The five transformations ─────────────────────────────────────────────── */

export type Beat = {
  id: string;
  /** What happened on the call. */
  cue: string;
  /** What Bylda did about it. */
  effect: string;
  /** The line as spoken, and the phrase that mattered inside it. */
  said: string;
  highlight: string;
  speaker: string;
  time: string;
  /** The record it becomes. */
  record: {
    kind: string;
    title: string;
    fields: { k: string; v: string; changed?: boolean }[];
    chip: string;
    accent: string;
  };
};

export const BEATS: Beat[] = [
  {
    id: "budget",
    cue: "Customer mentions budget.",
    effect: "Budget field updates automatically.",
    said: "Honestly, we have about forty thousand set aside for this quarter, and more if the numbers hold up.",
    highlight: "about forty thousand",
    speaker: "Dana Whitlock",
    time: "12:04",
    record: {
      kind: "Opportunity",
      title: "Platform Rollout",
      fields: [
        { k: "Budget", v: "$40,000", changed: true },
        { k: "Fiscal period", v: "Q3 · confirmed", changed: true },
        { k: "Owner", v: "Dana Whitlock" },
      ],
      chip: "CRM field updated",
      accent: BLUE,
    },
  },
  {
    id: "pricing",
    cue: "Customer asks for pricing.",
    effect: "Follow-up email drafts itself.",
    said: "Could you send over what pricing looks like for a team our size? We are around sixty seats today.",
    highlight: "send over what pricing looks like",
    speaker: "Dana Whitlock",
    time: "18:31",
    record: {
      kind: "Draft",
      title: "Pricing for 60 seats, as promised",
      fields: [
        { k: "To", v: "dana@acme.com" },
        { k: "Attached", v: "Acme · 60-seat plan.pdf", changed: true },
      ],
      chip: "Draft ready",
      accent: CYAN,
    },
  },
  {
    id: "meeting",
    cue: "Customer wants another meeting.",
    effect: "Calendar invite appears.",
    said: "Let us get my ops lead on a call next week. Thursday afternoon works well on our end.",
    highlight: "Thursday afternoon",
    speaker: "Dana Whitlock",
    time: "26:12",
    record: {
      kind: "Calendar",
      title: "Acme × Bylda — Technical Review",
      fields: [
        { k: "When", v: "Thu, Aug 14 · 2:00 PM", changed: true },
        { k: "Guests", v: "Dana, Marcus, You" },
      ],
      chip: "3 guests invited",
      accent: INDIGO,
    },
  },
  {
    id: "proposal",
    cue: "Rep promises to send a proposal.",
    effect: "Task is automatically created.",
    said: "I will have the full proposal in your inbox by Friday, with the security review attached.",
    highlight: "by Friday",
    speaker: "You",
    time: "31:47",
    record: {
      kind: "Task",
      title: "Send Acme proposal + security review",
      fields: [
        { k: "Due", v: "Fri, Aug 8 · 5:00 PM", changed: true },
        { k: "Owner", v: "You" },
        { k: "Priority", v: "High" },
      ],
      chip: "Added to your day",
      accent: GOLD,
    },
  },
  {
    id: "intent",
    cue: "Customer sounds interested.",
    effect: "Opportunity stage advances.",
    said: "This solves the exact problem we flagged last quarter. I want to move on it this month.",
    highlight: "I want to move on it",
    speaker: "Dana Whitlock",
    time: "38:55",
    record: {
      kind: "Pipeline",
      title: "Discovery → Proposal",
      fields: [
        { k: "Stage", v: "Proposal", changed: true },
        { k: "Probability", v: "45% → 70%", changed: true },
        { k: "Close date", v: "Aug 29" },
      ],
      chip: "Stage advanced",
      accent: "#10b981",
    },
  },
];

export const STORY_COPY = {
  kicker: "The call ends. The work doesn't.",
  headline: "One conversation, filed before you close the tab.",
  sub: "Bylda listens to every sales call, pulls out everything that matters, and turns it into records, drafts, invites and tasks — automatically.",
  closer: "Four seconds after hang-up, the call is already filed.",
} as const;

/* ── Small math helpers ───────────────────────────────────────────────────── */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Normalised position inside a window, clamped to its edges. */
export const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a || 1));

export const smoothstep = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Framerate-independent exponential approach. */
export const damp = (a: number, b: number, lambda: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));

/** Deterministic PRNG so the scene lays out identically on every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Piecewise lookup over the camera keyframes. */
export function sampleKeys(keys: [number, number][], p: number) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p1, v1] = keys[i];
    if (p <= p1) {
      const [p0, v0] = keys[i - 1];
      return lerp(v0, v1, smoothstep((p - p0) / (p1 - p0 || 1)));
    }
  }
  return keys[keys.length - 1][1];
}
