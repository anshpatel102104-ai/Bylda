/**
 * The one number the whole experience runs on.
 *
 * `<Canvas>` mounts its own React reconciler, so context does not cross the
 * boundary between the DOM overlay and the 3D scene. A module-level store keeps
 * both halves reading the exact same scroll position on the same frame — GSAP
 * writes it, `useFrame` reads it, nothing re-renders.
 */
export const scrollState = {
  /** Master progress across the pinned hero, 0 → 1. */
  p: 0,
  /** Pointer position in normalised device coords, for parallax. */
  pointerX: 0,
  pointerY: 0,
  /** Set once the intro reveal has played, so the scene stops fading in. */
  revealed: false,
};

export function resetScrollState() {
  scrollState.p = 0;
  scrollState.pointerX = 0;
  scrollState.pointerY = 0;
  scrollState.revealed = false;
}
