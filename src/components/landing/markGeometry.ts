/**
 * THE LOGO, AS A TUNNEL
 *
 * The Bylda badge is a thin rounded-square holding a sun over a floating island.
 * Kept at its real proportions — a hairline ring, not a picture frame — and then
 * extruded a long way back along Z. Head-on it reads as the logo you already
 * ship. Fly at it and the ring becomes the mouth of a tunnel.
 *
 * The island silhouette is the production SVG path from
 * `components/brand/Logo.tsx`, so this is the same drawing, not a lookalike.
 */
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/** Outer edge of the badge, in world units. */
export const BADGE = 4.0;
/** Ring thickness. The real badge border is a hairline; this is the 3D read. */
export const RING = 0.2;
/** How far back the badge opening runs before it lets you out. */
export const TUNNEL_DEPTH = 15;

const OUTER_RADIUS = BADGE * 0.3;
const INNER = BADGE - RING * 2;

/** SVG viewBox units → world. The logo art is authored on a 24×24 grid. */
const ART_SCALE = 3.3 / 24;

/** Maps a point in the logo's SVG grid onto the badge's local space. */
export function svgToMark(x: number, y: number): [number, number] {
  return [ART_SCALE * (x - 12), -ART_SCALE * (y - 12)];
}

export const SUN = {
  radius: 3 * ART_SCALE,
  position: svgToMark(16, 8),
};

export const ISLAND_SCALE = ART_SCALE;

/** Path lifted verbatim from the brand mark. */
const ISLAND_PATH =
  "M4 16c0-1.9 1.6-3.4 3.5-3.4.3 0 .6 0 .9.1A3.6 3.6 0 0 1 15 13a2.8 2.8 0 0 1 2.6 2.8c0 .2 0 .3-.1.5H4.3A2 2 0 0 1 4 16Z";

/* ── rounded rectangles ───────────────────────────────────────────────────── */

/** Counter-clockwise outline of a rounded rectangle, as explicit points. */
function roundedRectPoints(size: number, r: number, seg = 16): THREE.Vector2[] {
  const h = size / 2 - r;
  const corners: [number, number, number][] = [
    [h, h, 0],
    [-h, h, Math.PI / 2],
    [-h, -h, Math.PI],
    [h, -h, -Math.PI / 2],
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

function ringShape(outer: number, inner: number, outerR: number) {
  const shape = new THREE.Shape(roundedRectPoints(outer, outerR));
  const innerR = Math.max(0.04, outerR - (outer - inner) / 2);
  // Holes wind the opposite way from the outline.
  shape.holes.push(new THREE.Path(roundedRectPoints(inner, innerR).reverse()));
  return shape;
}

/**
 * The badge itself: a shallow ring, the depth of a real object rather than a
 * corridor. This is all that exists head-on, so the mark reads as the flat logo
 * with nothing but black behind the opening.
 */
export function buildBadgeGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(ringShape(BADGE, INNER, OUTER_RADIUS), {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments: 1,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The corridor behind the opening. Deliberately a separate object from the
 * badge: it is switched on only once the lens is close enough that the mouth
 * fills the frame, so the visitor never sees a box sitting inside a logo.
 */
export function buildTunnelGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(ringShape(BADGE, INNER, OUTER_RADIUS), {
    depth: TUNNEL_DEPTH,
    bevelEnabled: false,
    curveSegments: 1,
  });
  // Starts just behind the badge and runs back into negative Z.
  geometry.translate(0, 0, -TUNNEL_DEPTH - 0.14);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A thin flat ring used for the light bands set into the tunnel wall. They rush
 * past the lens and are what actually sells the speed.
 */
export function buildBandGeometry(inset: number): THREE.BufferGeometry {
  const outer = INNER - inset;
  const geometry = new THREE.ExtrudeGeometry(ringShape(outer, outer - 0.09, OUTER_RADIUS - inset), {
    depth: 0.05,
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
    depth: 1.4,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.16,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments: 18,
  });
  geometry.translate(-12, -12, -0.7);
  geometry.computeVertexNormals();
  return geometry;
}

/* ── materials ────────────────────────────────────────────────────────────── */

export function makeChromeMaterials() {
  // The badge: bright polished chrome, the hero object.
  const badge = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#ffffff"),
    metalness: 1,
    roughness: 0.08,
    envMapIntensity: 1.45,
  });
  // The corridor: dark chrome. A metal's colour tints what it reflects, so a
  // near-black body keeps the tube moody instead of a white-hot box, and the
  // higher roughness stops the walls aliasing into speckle at grazing angles.
  // Front-side only — a double-sided tube draws both walls into nearly the
  // same pixels from inside.
  const tunnel = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#63748f"),
    metalness: 1,
    roughness: 0.3,
    envMapIntensity: 1.35,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 0,
  });
  // The sun and island carry brand colour, not just reflections — a little
  // emissive keeps them readable as the logo at any angle.
  const sun = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f5b638"),
    metalness: 0.75,
    roughness: 0.22,
    envMapIntensity: 1.1,
    emissive: new THREE.Color("#c07b06"),
    emissiveIntensity: 0.55,
  });
  const island = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#cfe6ff"),
    metalness: 0.8,
    roughness: 0.2,
    envMapIntensity: 1.1,
    emissive: new THREE.Color("#2a5f9e"),
    emissiveIntensity: 0.35,
  });
  return { badge, tunnel, sun, island };
}
