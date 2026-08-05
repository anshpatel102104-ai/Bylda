/**
 * THE LANDING
 *
 * The corridor opens out and everything the call produced snaps into four tidy
 * columns — records, follow-ups, scheduling, pipeline. The last thing the
 * visitor sees is not an effect: it is their CRM, already done.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeAuraTexture, makeCardTexture } from "./cardTexture";
import { scrollState } from "./scrollState";
import { ACCENT, WALL, WALL_Z, lerp, mulberry32, range, smoothstep, type CardSpec } from "./story";

type Slot = {
  material: THREE.MeshBasicMaterial;
  width: number;
  height: number;
  /** Where it ends up. */
  home: THREE.Vector3;
  /** Where it flies in from. */
  origin: THREE.Vector3;
  spin: THREE.Euler;
  /** Stagger, so the board fills in rather than snapping. */
  delay: number;
  accent: string;
};

/** Reflows the four columns into two, for viewports that cannot hold four. */
function columnsFor(portrait: boolean) {
  if (!portrait) return WALL;
  const left: CardSpec[] = [...WALL[0], ...WALL[1]];
  const right: CardSpec[] = [...WALL[2], ...WALL[3]];
  return [left, right];
}

export function ResolveWall({
  fit = 1,
  portrait = false,
  textureWidth = 640,
}: {
  fit?: number;
  portrait?: boolean;
  textureWidth?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<THREE.Mesh[]>([]);
  const glow = useRef<THREE.Mesh>(null);

  const slots = useMemo(() => {
    const rand = mulberry32(770077);
    const out: Slot[] = [];
    const grid = columnsFor(portrait);
    const colWidth = portrait ? 2.2 : 3.5 * fit;
    const cardWidth = portrait ? 1.95 : 3.0 * fit;
    const gap = portrait ? 0.2 : 0.3 * fit;
    const columns = grid.length;

    grid.forEach((column, ci) => {
      const x = (ci - (columns - 1) / 2) * colWidth;
      const heights = column.map((spec) => cardWidth / makeCardTexture(spec, textureWidth).aspect);
      // Each column is centred on its own height so the board reads as a grid
      // rather than a set of ragged stacks.
      const total = heights.reduce((a, b) => a + b, 0) + gap * (column.length - 1);
      // On a phone the closing copy owns the bottom third, so the board lifts
      // clear of it rather than hiding behind the scrim.
      let y = total / 2 + (portrait ? 1.6 : 0);

      column.forEach((spec, ri) => {
        const card = makeCardTexture(spec, textureWidth);
        const height = heights[ri];
        y -= height / 2;
        out.push({
          material: new THREE.MeshBasicMaterial({
            map: card.texture,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: true,
          }),
          width: cardWidth,
          height,
          home: new THREE.Vector3(x, y, WALL_Z + (rand() - 0.5) * 0.5),
          // They come in from around the board, never from behind the lens —
          // anything spawned closer than the camera pops instead of arriving.
          origin: new THREE.Vector3(
            x + (rand() - 0.5) * 16 * fit,
            y + (rand() - 0.5) * 12 * fit,
            WALL_Z + 1 + rand() * 6,
          ),
          spin: new THREE.Euler((rand() - 0.5) * 1.4, (rand() - 0.5) * 2.0, (rand() - 0.5) * 0.9),
          delay: ci * 0.006 + ri * 0.009,
          accent: ACCENT[spec.accent],
        });
        y -= height / 2 + gap;
      });
    });
    return out;
  }, [fit, portrait, textureWidth]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const p = scrollState.p;

    const wake = range(p, 0.855, 0.89);
    g.visible = wake > 0.001;
    if (!g.visible) return;

    slots.forEach((slot, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      const t = smoothstep(range(p, 0.872 + slot.delay, 0.958 + slot.delay));

      mesh.position.lerpVectors(slot.origin, slot.home, t);
      mesh.rotation.set(slot.spin.x * (1 - t), slot.spin.y * (1 - t), slot.spin.z * (1 - t));
      mesh.scale.setScalar(lerp(0.7, 1, t));
      slot.material.opacity = smoothstep(range(p, 0.866 + slot.delay, 0.915 + slot.delay)) * 0.97;
    });

    if (glow.current) {
      const m = glow.current.material as THREE.MeshBasicMaterial;
      m.opacity = smoothstep(range(p, 0.9, 1.0)) * 0.16;
    }
  });

  return (
    <group ref={group} visible={false}>
      {slots.map((slot, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) meshes.current[i] = m;
          }}
          material={slot.material}
        >
          <planeGeometry args={[slot.width, slot.height]} />
        </mesh>
      ))}

      {/* Soft wash behind the board so it reads as lit, not floating in ink. */}
      <mesh ref={glow} position={[0, 0, WALL_Z - 3]}>
        <planeGeometry args={[portrait ? 20 : 34 * fit, portrait ? 26 : 22 * fit]} />
        <meshBasicMaterial
          map={makeAuraTexture()}
          color={ACCENT.sky}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
