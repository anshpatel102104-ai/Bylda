/**
 * INSIDE THE MARK
 *
 * Not cyberspace — a workspace mid-thought. Everything the call is carrying is
 * already pulled out and hanging in the corridor: what was said, who said it,
 * what it changed, and what happens next. The threads between the cards are the
 * connections Bylda has already made.
 */
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { makeCardTexture } from "./cardTexture";
import { scrollState } from "./scrollState";
import { ACCENT, FIELD_CARDS, PHASE, clamp01, mulberry32, range, smoothstep } from "./story";

/** How many panels line the corridor. The spec set repeats to fill it. */
const FIELD_COUNT = 40;

type Placed = {
  position: THREE.Vector3;
  width: number;
  height: number;
  /** Phase offsets so no two cards breathe together. */
  bob: number;
  sway: number;
  material: THREE.MeshBasicMaterial;
};

export function DataField({
  fit = 1,
  textureWidth = 640,
}: {
  fit?: number;
  textureWidth?: number;
}) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<THREE.Mesh[]>([]);

  const { cards, threads } = useMemo(() => {
    const rand = mulberry32(20260805);
    const placed: Placed[] = [];

    // Two loose helices down the corridor, offset from each other, so the field
    // reads as arranged rather than scattered. The set repeats — the textures
    // are shared, so density costs nothing but draw calls.
    for (let i = 0; i < FIELD_COUNT; i++) {
      const spec = FIELD_CARDS[i % FIELD_CARDS.length];
      const card = makeCardTexture(spec, textureWidth);
      const strand = i % 2;
      const angle = i * 1.09 + strand * Math.PI + rand() * 0.5;
      const radius = (3.5 + strand * 1.1 + rand() * 2.2) * fit;
      const z = -8 - i * 2.4 - rand() * 1.2;
      const width = (2.6 + rand() * 1.0) * fit;

      placed.push({
        position: new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.62, z),
        width,
        height: width / card.aspect,
        bob: rand() * Math.PI * 2,
        sway: 0.5 + rand(),
        material: new THREE.MeshBasicMaterial({
          map: card.texture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: true,
        }),
      });
    }

    // Threads: each card reaches to the next one on its own strand.
    const points: number[] = [];
    for (let i = 0; i < placed.length - 2; i++) {
      points.push(...placed[i].position.toArray(), ...placed[i + 2].position.toArray());
    }
    const threadGeometry = new THREE.BufferGeometry();
    threadGeometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));

    return { cards: placed, threads: threadGeometry };
  }, [fit, textureWidth]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;

    const p = scrollState.p;
    // Nothing inside is visible until the aperture is close enough to see
    // through. Once the transformations start, the ambient work steps back so
    // the beat in front of the camera is the only thing asking to be read.
    const arrival =
      smoothstep(range(p, 0.16, 0.31)) *
      (1 - 0.55 * smoothstep(range(p, PHASE.beats[0] - 0.03, PHASE.beats[0] + 0.04))) *
      (1 - smoothstep(range(p, 0.86, 0.93)));
    g.visible = arrival > 0.001;
    if (!g.visible) return;

    const t = performance.now() / 1000;
    const camZ = camera.position.z;

    cards.forEach((card, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;

      mesh.position.set(
        card.position.x + Math.sin(t * 0.19 * card.sway + card.bob) * 0.22,
        card.position.y + Math.sin(t * 0.26 * card.sway + card.bob) * 0.3,
        card.position.z,
      );
      // Faces the corridor the camera is travelling down.
      mesh.lookAt(0, 0, card.position.z + 0.001);
      mesh.rotation.z += Math.sin(t * 0.13 + card.bob) * 0.012;

      // Fade out as a card slides past the lens; fog handles the far end.
      const ahead = camZ - card.position.z;
      const near = clamp01((ahead - 1.2) / 4.5);
      const behind = 1 - clamp01(-ahead / 6);
      card.material.opacity = arrival * near * behind * 0.94;
      mesh.visible = card.material.opacity > 0.004;
    });

    const line = g.children[g.children.length - 1] as THREE.LineSegments;
    if (line) (line.material as THREE.LineBasicMaterial).opacity = arrival * 0.07;
  });

  return (
    <group ref={group}>
      {cards.map((card, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) meshes.current[i] = m;
          }}
          material={card.material}
        >
          <planeGeometry args={[card.width, card.height]} />
        </mesh>
      ))}

      <lineSegments geometry={threads}>
        <lineBasicMaterial
          color={ACCENT.sky}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}
