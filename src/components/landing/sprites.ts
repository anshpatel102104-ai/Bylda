/** Soft round sprite, drawn once and shared by every particle system. */
import * as THREE from "three";

let dot: THREE.CanvasTexture | null = null;

export function makeDotTexture(): THREE.CanvasTexture {
  if (dot) return dot;
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
  dot = new THREE.CanvasTexture(canvas);
  dot.colorSpace = THREE.SRGBColorSpace;
  return dot;
}

let aura: THREE.CanvasTexture | null = null;

/** Wide falloff, for light bleeding out of the badge opening. */
export function makeAuraTexture(): THREE.CanvasTexture {
  if (aura) return aura;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.16, "rgba(190,232,255,0.55)");
  g.addColorStop(0.45, "rgba(59,130,246,0.16)");
  g.addColorStop(1, "rgba(59,130,246,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  aura = new THREE.CanvasTexture(canvas);
  aura.colorSpace = THREE.SRGBColorSpace;
  return aura;
}
