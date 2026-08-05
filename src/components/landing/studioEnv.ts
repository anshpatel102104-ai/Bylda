/**
 * A studio, built in code.
 *
 * Polished chrome is entirely reflection — with nothing to reflect it renders
 * as flat grey. This assembles a small set of emissive panels (a softbox, two
 * vertical kickers, a warm bounce, a cool rim) and pre-filters them into an
 * environment map. Same idea as a photographer's lighting setup, and no HDRI to
 * download at runtime.
 */
import * as THREE from "three";

type Panel = {
  color: [number, number, number];
  intensity: number;
  size: [number, number];
  position: [number, number, number];
  /** Look-at target; panels always face the origin unless told otherwise. */
  target?: [number, number, number];
};

const PANELS: Panel[] = [
  // Big overhead softbox — the primary sheen down the top of the mark.
  { color: [1, 1, 1], intensity: 3.4, size: [16, 8], position: [0, 9, 2] },
  // Vertical kickers: the long streak highlights that read as "chrome".
  { color: [0.72, 0.86, 1], intensity: 5.2, size: [1.1, 14], position: [-7.5, 0.5, 5] },
  { color: [0.86, 0.93, 1], intensity: 4.0, size: [0.8, 12], position: [7.8, -0.5, 4] },
  // Warm bounce from below, tinted toward the brand gold.
  { color: [1, 0.79, 0.42], intensity: 1.9, size: [10, 4], position: [1.5, -7.5, 3] },
  // Cool rim behind, so the silhouette separates from the void.
  { color: [0.34, 0.72, 1], intensity: 2.6, size: [9, 9], position: [-2, 1, -9] },
  // Small hot spot for a catchlight in the sun.
  { color: [1, 1, 1], intensity: 7.0, size: [1.4, 1.4], position: [3.4, 4.2, 6.5] },
];

/**
 * Builds the pre-filtered environment. The caller owns the returned texture and
 * must dispose it on unmount.
 */
/**
 * A dim gradient dome behind the panels. Without it, polished metal reflects
 * pure black everywhere the lights do not hit and reads as a flat silhouette —
 * this is what gives the mark body while keeping the room dark.
 */
function buildSurround(): { mesh: THREE.Mesh; dispose: () => void } {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  // Values are deliberately high: sRGB mid-greys collapse to almost nothing in
  // linear space, and a dome that looks "dark grey" here reflects as black.
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#8ea4bd");
  g.addColorStop(0.34, "#4d5f76");
  g.addColorStop(0.62, "#1d2531");
  g.addColorStop(0.85, "#0a0d14");
  g.addColorStop(1, "#04050b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.SphereGeometry(60, 32, 24);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    toneMapped: false,
  });

  return {
    mesh: new THREE.Mesh(geometry, material),
    dispose: () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

export function buildStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry(1, 1);
  const disposables: THREE.Material[] = [];

  const surround = buildSurround();
  scene.add(surround.mesh);

  for (const panel of PANELS) {
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
    // Values above 1 are what give the reflections real range.
    material.color.setRGB(
      panel.color[0] * panel.intensity,
      panel.color[1] * panel.intensity,
      panel.color[2] * panel.intensity,
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(panel.size[0], panel.size[1], 1);
    mesh.position.set(...panel.position);
    mesh.lookAt(new THREE.Vector3(...(panel.target ?? [0, 0, 0])));
    scene.add(mesh);
    disposables.push(material);
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromScene(scene, 0.02);
  const texture = target.texture;

  pmrem.dispose();
  geometry.dispose();
  surround.dispose();
  disposables.forEach((m) => m.dispose());

  return texture;
}
