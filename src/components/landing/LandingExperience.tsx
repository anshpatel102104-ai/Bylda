/**
 * Picks which landing the visitor gets.
 *
 * The server always renders the static page — it needs no JS, carries the whole
 * pitch, and is what search engines and reduced-motion visitors should see. Once
 * mounted we check for reduced motion, a real WebGL2 context and enough device
 * to drive it, and only then swap in the cinematic version.
 */
import { useEffect, useState } from "react";
import { CinematicLanding } from "./CinematicLanding";
import { StaticLanding } from "./StaticLanding";
import type { Quality } from "./Scene";

type Mode = { kind: "static" } | { kind: "cinematic"; quality: Quality };

function detect(): Mode {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return { kind: "static" };

  // A context we actually create and throw away — feature strings lie.
  let supported = false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    supported = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    supported = false;
  }
  if (!supported) return { kind: "static" };

  // Coarse pointer, few cores or a small viewport: still cinematic, but cheaper.
  const cores = navigator.hardwareConcurrency ?? 4;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 640;
  const quality: Quality = cores <= 4 || narrow ? "low" : "high";
  return { kind: "cinematic", quality };
}

export function LandingExperience() {
  const [mode, setMode] = useState<Mode>({ kind: "static" });

  useEffect(() => {
    setMode(detect());
  }, []);

  if (mode.kind === "cinematic") return <CinematicLanding quality={mode.quality} />;
  return <StaticLanding />;
}
