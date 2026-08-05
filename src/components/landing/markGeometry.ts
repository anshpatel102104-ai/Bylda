/**
 * THE MARK, IN THREE DIMENSIONS
 *
 * The Bylda logo is a sun rising over a floating island, held inside a rounded
 * badge. Here the badge becomes a machined aperture with a hollow centre — the
 * thing the camera eventually flies through — and the sun and island become
 * solid objects that part to let it pass.
 *
 * The island silhouette is the production SVG path, extruded, so the 3D mark is
 * the same drawing as `components/brand/Logo.tsx` rather than an approximation.
 */
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/** Outer edge of the aperture, in world units. */
export const FRAME_OUTER = 3.5;
/** Inner edge — this is the hole the camera passes through. */
export const FRAME_INNER = 2.52;
export const FRAME_DEPTH = 0.42;

/** SVG viewBox units → world units. The logo art is authored on a 24×24 grid. */
const MARK_SCALE = 2.25 / 24;

/** Maps a point in the logo's SVG grid onto the mark's local space. */
export function svgToMark(x: number, y: number): [number, number] {
  return [MARK_SCALE * (x - 12), -MARK_SCALE * (y - 12)];
}

export const SUN = {
  radius: 3 * MARK_SCALE,
  position: svgToMark(16, 8),
};

/** Path lifted verbatim from the brand mark. */
const ISLAND_PATH =
  "M4 16c0-1.9 1.6-3.4 3.5-3.4.3 0 .6 0 .9.1A3.6 3.6 0 0 1 15 13a2.8 2.8 0 0 1 2.6 2.8c0 .2 0 .3-.1.5H4.3A2 2 0 0 1 4 16Z";

/* ── rounded rectangles ───────────────────────────────────────────────────── */

/** Counter-clockwise outline of a rounded rectangle, as explicit points. */
function roundedRectPoints(w: number, h: number, r: number, seg = 14): THREE.Vector2[] {
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const corners: [number, number, number][] = [
    [hw, hh, 0],
    [-hw, hh, Math.PI / 2],
    [-hw, -hh, Math.PI],
    [hw, -hh, -Math.PI / 2],
  ];
  const pts: THREE.Vector2[] = [];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = start + (i / seg) * (Math.PI / 2);
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  }
  return pts;
}

/**
 * The aperture: a rounded square with a rounded square punched out of it,
 * extruded and bevelled so the edges catch the studio kickers.
 */
export function buildFrameGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape(roundedRectPoints(FRAME_OUTER, FRAME_OUTER, 0.78));
  // Holes wind the opposite way from the outline.
  shape.holes.push(new THREE.Path(roundedRectPoints(FRAME_INNER, FRAME_INNER, 0.46).reverse()));

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: FRAME_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments: 1,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A thin ring that sits just inside the aperture. Rendered additively, it is
 * the light spilling out of the opening as the camera commits to it.
 */
export function buildRimGeometry(): THREE.BufferGeometry {
  const inner = FRAME_INNER - 0.02;
  const shape = new THREE.Shape(roundedRectPoints(inner + 0.14, inner + 0.14, 0.5));
  shape.holes.push(new THREE.Path(roundedRectPoints(inner, inner, 0.46).reverse()));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: FRAME_DEPTH * 0.72,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.center();
  return geometry;
}

/**
 * The island, extruded from the brand path. Returned in SVG orientation
 * (Y down, centred on the badge) — the caller flips it with a half turn about
 * X, which keeps the winding intact so the normals stay outward-facing.
 */
export function buildIslandGeometry(): THREE.BufferGeometry {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${ISLAND_PATH}"/></svg>`;
  const paths = new SVGLoader().parse(svg).paths;
  const shapes = paths.flatMap((p) => SVGLoader.createShapes(p));

  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: 1.6,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.18,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments: 18,
  });
  // Centre on the badge origin so the half turn about X lands it correctly.
  geometry.translate(-12, -12, -0.8);
  geometry.computeVertexNormals();
  return geometry;
}

export const ISLAND_SCALE = MARK_SCALE;

/* ── materials ────────────────────────────────────────────────────────────── */

export function makeChromeMaterials() {
  const frame = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#ffffff"),
    metalness: 1,
    roughness: 0.055,
    envMapIntensity: 1.45,
  });
  const sun = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#ffcc57"),
    metalness: 1,
    roughness: 0.085,
    envMapIntensity: 1.6,
  });
  const island = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#d6efff"),
    metalness: 1,
    roughness: 0.13,
    envMapIntensity: 1.35,
  });
  return { frame, sun, island };
}
