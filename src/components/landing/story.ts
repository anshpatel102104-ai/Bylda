/**
 * THE STORY — data + timing for the cinematic landing experience.
 *
 * One idea, told in one continuous shot: the sales call ends, and Bylda does
 * everything that used to happen afterwards. The scroll is a camera move, not a
 * page scroll — every value in here is expressed as a position on that single
 * 0 → 1 timeline so the 3D scene and the DOM overlay stay frame-locked.
 */

/* ── Palette ──────────────────────────────────────────────────────────────── */

/** Brand accents, mirrored from the dark theme tokens in `src/styles.css`. */
export const ACCENT = {
  sky: "#38bdf8",
  cyan: "#22d3ee",
  gold: "#fbbf24",
  green: "#34d399",
  blue: "#60a5fa",
  slate: "#94a3b8",
  rose: "#fb7185",
} as const;

export type AccentKey = keyof typeof ACCENT;

export const VOID_COLOR = "#04050b";

/* ── Timeline ─────────────────────────────────────────────────────────────── */

/**
 * Phase windows on the master scroll progress (0 → 1). The hero is pinned for
 * the whole thing, so these are camera beats rather than page sections.
 */
export const PHASE = {
  /** Logo floats in the dark. Nothing moves but the light. */
  hold: [0.0, 0.075],
  /** Camera starts falling toward the mark; the sun and island part. */
  approach: [0.075, 0.205],
  /** Through the aperture. The logo is a portal. */
  portal: [0.205, 0.275],
  /** Inside: the call, mid-flight, being taken apart. */
  field: [0.275, 0.45],
  /** Five transformations. Conversation becomes CRM. */
  beats: [0.45, 0.9],
  /** Everything lands in one organized pipeline. */
  resolve: [0.9, 1.0],
} as const;

/** Total pinned scroll distance, as a multiple of viewport height. */
export const SCROLL_LENGTH = 8.2;

/** Where each transformation beat sits along the corridor. */
export const BEAT_Z = [-26, -37.5, -49, -60.5, -72];

/** How much of the master timeline each transformation gets. */
export const BEAT_SPAN = (PHASE.beats[1] - PHASE.beats[0]) / BEAT_Z.length;

/** Master progress at which the camera is level with a given beat. */
export const beatCenter = (i: number) => PHASE.beats[0] + (i + 0.5) * BEAT_SPAN;

/**
 * Z positions the camera passes through, keyed to master progress. The beat
 * stations are keyframed individually so the camera eases in at each one and
 * accelerates between them, instead of gliding through all five at one speed.
 */
export const CAMERA_KEYS: [progress: number, z: number][] = [
  [0.0, 15.5],
  [0.075, 14.2],
  [0.145, 8.2],
  [0.205, 0.6],
  [0.275, -4.5],
  [PHASE.beats[0], -19],
  ...BEAT_Z.map((z, i) => [beatCenter(i), z] as [number, number]),
  [PHASE.beats[1], -80],
  [1.0, -93],
];

/* ── Card model ───────────────────────────────────────────────────────────── */

export type CardKind =
  | "transcript"
  | "record"
  | "email"
  | "calendar"
  | "task"
  | "deal"
  | "note"
  | "objection";

export type CardField = {
  k: string;
  v: string;
  /** Renders the value as a glowing accent pill — "this just changed". */
  changed?: boolean;
};

export type CardSpec = {
  kind: CardKind;
  accent: AccentKey;
  /** Small uppercase label in the header row. */
  eyebrow: string;
  /** Right-aligned meta in the header row — a timestamp, a source. */
  meta?: string;
  title?: string;
  /** Body copy. For transcripts this is the quote itself. */
  lines?: string[];
  fields?: CardField[];
  /** Footer pill — the outcome. */
  chip?: string;
  /** Substring of `lines` to mark as the phrase that mattered. */
  highlight?: string;
};

/* ── The five transformations ─────────────────────────────────────────────── */

export type Beat = {
  id: string;
  /** DOM caption, line 1 — what happened on the call. */
  cue: string;
  /** DOM caption, line 2 — what Bylda did about it. */
  effect: string;
  /** The raw conversation, breaking apart. */
  said: CardSpec;
  /** The record it becomes, assembling. */
  became: CardSpec;
};

export const BEATS: Beat[] = [
  {
    id: "budget",
    cue: "Customer mentions budget.",
    effect: "Budget field updates automatically.",
    said: {
      kind: "transcript",
      accent: "slate",
      eyebrow: "Transcript",
      meta: "12:04",
      lines: [
        "Honestly, we have about forty thousand set aside for this quarter, and more if the numbers hold up.",
      ],
      highlight: "about forty thousand",
    },
    became: {
      kind: "record",
      accent: "sky",
      eyebrow: "Opportunity",
      meta: "Acme Corp",
      title: "Platform Rollout",
      fields: [
        { k: "Budget", v: "$40,000", changed: true },
        { k: "Fiscal period", v: "Q3 · confirmed", changed: true },
        { k: "Owner", v: "Dana Whitlock" },
      ],
      chip: "CRM field updated",
    },
  },
  {
    id: "pricing",
    cue: "Customer asks for pricing.",
    effect: "Follow-up email drafts itself.",
    said: {
      kind: "transcript",
      accent: "slate",
      eyebrow: "Transcript",
      meta: "18:31",
      lines: [
        "Could you send over what pricing looks like for a team our size? We are around sixty seats today.",
      ],
      highlight: "send over what pricing looks like",
    },
    became: {
      kind: "email",
      accent: "cyan",
      eyebrow: "Draft",
      meta: "Ready to send",
      title: "Pricing for 60 seats, as promised",
      fields: [
        { k: "To", v: "dana@acme.com" },
        { k: "Attached", v: "Acme · 60-seat plan.pdf", changed: true },
      ],
      lines: ["Hi Dana — great talking today. Here is the 60-seat breakdown we walked through…"],
      chip: "Draft ready",
    },
  },
  {
    id: "meeting",
    cue: "Customer wants another meeting.",
    effect: "Calendar invite appears.",
    said: {
      kind: "transcript",
      accent: "slate",
      eyebrow: "Transcript",
      meta: "26:12",
      lines: [
        "Let us get my ops lead on a call next week. Thursday afternoon works well on our end.",
      ],
      highlight: "Thursday afternoon",
    },
    became: {
      kind: "calendar",
      accent: "blue",
      eyebrow: "Calendar",
      meta: "Invite sent",
      title: "Acme × Bylda — Technical Review",
      fields: [
        { k: "When", v: "Thu, Aug 14 · 2:00 PM", changed: true },
        { k: "Guests", v: "Dana, Marcus, You" },
      ],
      chip: "3 guests invited",
    },
  },
  {
    id: "proposal",
    cue: "Rep promises to send a proposal.",
    effect: "Task is automatically created.",
    said: {
      kind: "transcript",
      accent: "slate",
      eyebrow: "Transcript",
      meta: "31:47",
      lines: [
        "I will have the full proposal in your inbox by Friday, with the security review attached.",
      ],
      highlight: "by Friday",
    },
    became: {
      kind: "task",
      accent: "gold",
      eyebrow: "Task",
      meta: "Auto-created",
      title: "Send Acme proposal + security review",
      fields: [
        { k: "Due", v: "Fri, Aug 8 · 5:00 PM", changed: true },
        { k: "Owner", v: "You" },
        { k: "Priority", v: "High" },
      ],
      chip: "Added to your day",
    },
  },
  {
    id: "intent",
    cue: "Customer sounds interested.",
    effect: "Opportunity stage advances.",
    said: {
      kind: "transcript",
      accent: "slate",
      eyebrow: "Transcript",
      meta: "38:55",
      lines: [
        "This solves the exact problem we flagged last quarter. I want to move on it this month.",
      ],
      highlight: "I want to move on it",
    },
    became: {
      kind: "deal",
      accent: "green",
      eyebrow: "Pipeline",
      meta: "Acme Corp",
      title: "Discovery → Proposal",
      fields: [
        { k: "Stage", v: "Proposal", changed: true },
        { k: "Probability", v: "45% → 70%", changed: true },
        { k: "Close date", v: "Aug 29" },
      ],
      chip: "Stage advanced",
    },
  },
];

/* ── Ambient field — everything the call is made of ───────────────────────── */

/**
 * The cloud of live work the camera flies through after the portal. Each entry
 * is one of the things Bylda pulls out of a conversation.
 */
export const FIELD_CARDS: CardSpec[] = [
  {
    kind: "transcript",
    accent: "slate",
    eyebrow: "Transcript",
    meta: "04:18",
    lines: ["We are running this on three different tools right now, and none of them talk."],
  },
  {
    kind: "transcript",
    accent: "slate",
    eyebrow: "Transcript",
    meta: "09:52",
    lines: ["Who else needs to be in the room before you can sign something like this?"],
  },
  {
    kind: "transcript",
    accent: "slate",
    eyebrow: "Transcript",
    meta: "15:07",
    lines: ["Our renewal with the current vendor is up at the end of October."],
  },
  {
    kind: "transcript",
    accent: "slate",
    eyebrow: "Transcript",
    meta: "22:40",
    lines: ["If onboarding takes more than a week, my team will quietly stop using it."],
  },
  {
    kind: "transcript",
    accent: "slate",
    eyebrow: "Transcript",
    meta: "29:03",
    lines: ["Send me something I can forward to finance without editing it."],
  },
  {
    kind: "record",
    accent: "sky",
    eyebrow: "Contact",
    meta: "Updated now",
    title: "Dana Whitlock",
    fields: [
      { k: "Role", v: "VP Revenue Operations", changed: true },
      { k: "Company", v: "Acme Corp" },
    ],
    chip: "Enriched from call",
  },
  {
    kind: "record",
    accent: "sky",
    eyebrow: "Contact",
    meta: "New",
    title: "Marcus Reyes",
    fields: [
      { k: "Role", v: "Head of Ops", changed: true },
      { k: "Mentioned", v: "Decision maker" },
    ],
    chip: "Contact created",
  },
  {
    kind: "calendar",
    accent: "blue",
    eyebrow: "Calendar",
    meta: "Scheduled",
    title: "Technical review",
    fields: [{ k: "When", v: "Thu, Aug 14 · 2:00 PM", changed: true }],
    chip: "Invite sent",
  },
  {
    kind: "calendar",
    accent: "blue",
    eyebrow: "Calendar",
    meta: "Held",
    title: "Security questionnaire walkthrough",
    fields: [{ k: "When", v: "Tue, Aug 19 · 11:00 AM" }],
  },
  {
    kind: "email",
    accent: "cyan",
    eyebrow: "Draft",
    meta: "Awaiting review",
    title: "Recap + next steps",
    lines: ["Hi Dana — here is everything we covered, plus the two items I owe you."],
    chip: "Draft ready",
  },
  {
    kind: "email",
    accent: "cyan",
    eyebrow: "Draft",
    meta: "Awaiting review",
    title: "Intro to your onboarding lead",
    lines: ["Looping in Priya, who will run your first two weeks."],
    chip: "Draft ready",
  },
  {
    kind: "task",
    accent: "gold",
    eyebrow: "Follow-up",
    meta: "Auto-created",
    title: "Send the 60-seat pricing sheet",
    fields: [{ k: "Due", v: "Today · 5:00 PM", changed: true }],
    chip: "Assigned to you",
  },
  {
    kind: "task",
    accent: "gold",
    eyebrow: "Action item",
    meta: "Auto-created",
    title: "Loop in security for the questionnaire",
    fields: [{ k: "Due", v: "Wed, Aug 6" }],
    chip: "Assigned to Priya",
  },
  {
    kind: "task",
    accent: "gold",
    eyebrow: "Reminder",
    meta: "Scheduled",
    title: "Nudge Dana if no reply by Thursday",
    fields: [{ k: "Trigger", v: "72h of silence", changed: true }],
    chip: "Watching the thread",
  },
  {
    kind: "deal",
    accent: "green",
    eyebrow: "Opportunity",
    meta: "Acme Corp",
    title: "Platform Rollout",
    fields: [
      { k: "Value", v: "$40,000", changed: true },
      { k: "Stage", v: "Proposal" },
    ],
    chip: "Stage advanced",
  },
  {
    kind: "deal",
    accent: "green",
    eyebrow: "Forecast",
    meta: "This quarter",
    title: "Weighted pipeline +$28,000",
    fields: [{ k: "Probability", v: "45% → 70%", changed: true }],
    chip: "Recalculated",
  },
  {
    kind: "note",
    accent: "sky",
    eyebrow: "Company note",
    meta: "Acme Corp",
    title: "Three tools, no integration",
    lines: ["Current stack does not sync. Consolidation is the real buying trigger."],
  },
  {
    kind: "note",
    accent: "sky",
    eyebrow: "Company note",
    meta: "Acme Corp",
    title: "Renewal window",
    lines: ["Incumbent contract lapses end of October. Decision must land before then."],
  },
  {
    kind: "objection",
    accent: "rose",
    eyebrow: "Objection",
    meta: "Logged",
    title: "Onboarding time",
    lines: ["Worried the team abandons it if setup runs past one week."],
    chip: "Needs a response",
  },
  {
    kind: "objection",
    accent: "rose",
    eyebrow: "Objection",
    meta: "Logged",
    title: "Finance approval",
    lines: ["Wants a document forwardable to finance with no edits."],
    chip: "Handled in draft",
  },
  {
    kind: "note",
    accent: "cyan",
    eyebrow: "Next step",
    meta: "Owned by you",
    title: "Proposal by Friday",
    lines: ["Security review attached. Confirm seat count before sending."],
    chip: "On the calendar",
  },
  {
    kind: "note",
    accent: "cyan",
    eyebrow: "Next step",
    meta: "Owned by Priya",
    title: "Onboarding plan for 60 seats",
    lines: ["Draft a one-week rollout so the timing objection dies before it lands."],
  },
];

/**
 * The closing image: everything the call produced, filed into four columns.
 * Columns read left to right as records, follow-ups, scheduling, pipeline.
 */
export const WALL: CardSpec[][] = [
  [FIELD_CARDS[5], FIELD_CARDS[6], BEATS[0].became],
  [BEATS[1].became, FIELD_CARDS[9], BEATS[3].became],
  [BEATS[2].became, FIELD_CARDS[8], FIELD_CARDS[13]],
  [BEATS[4].became, FIELD_CARDS[15], FIELD_CARDS[20]],
];

/** Where the resolved board hangs, and where the camera stops to look at it. */
export const WALL_Z = -104;

/* ── Copy ─────────────────────────────────────────────────────────────────── */

export const COPY = {
  eyebrow: "Bylda",
  headline: ["The Call Ends.", "The Work Doesn't."],
  sub: "Bylda listens to every sales conversation, extracts everything that matters, updates your CRM, creates follow-ups, assigns action items, and keeps your pipeline moving automatically.",
  primaryCta: { label: "Book a Demo", href: "/demo" },
  secondaryCta: { label: "Watch Demo", href: "/demo" },
  scrollHint: "Scroll",
  hud: { label: "Live call", org: "Acme Corp", duration: "42:18" },
  inside: {
    kicker: "Inside the call",
    line: "One conversation. Everything it was carrying.",
  },
  resolve: {
    kicker: "Four seconds after hang-up",
    headline: "The call is already filed.",
    sub: "CRM updated. Follow-ups drafted. Tasks assigned. Pipeline moved. Nobody typed a word.",
  },
} as const;

/* ── Small math helpers used by both the scene and the overlay ────────────── */

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

/** Piecewise-linear lookup over the camera keyframes. */
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
