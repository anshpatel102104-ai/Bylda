/**
 * The logo, treated as an object rather than a graphic — and then as a door.
 *
 * It holds still and breathes while the hero copy reads. As the camera commits,
 * the sun lifts away and the island drops out of the corridor, the inner rim
 * lights, and what was a mark becomes an opening.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  FRAME_DEPTH,
  ISLAND_SCALE,
  SUN,
  buildFrameGeometry,
  buildIslandGeometry,
  buildRimGeometry,
  makeChromeMaterials,
} from "./markGeometry";
import { makeAuraTexture } from "./cardTexture";
import { scrollState } from "./scrollState";
import { ACCENT, PHASE, damp, range, smoothstep } from "./story";

export function ByldaMark({
  fit = 1,
  /**
   * How far above the lens axis the mark sits while the hero copy reads. It
   * settles back onto the axis as the camera commits, so the flight lines up
   * with the centre of the aperture.
   */
  lift = 2.4,
}: {
  fit?: number;
  lift?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const sun = useRef<THREE.Mesh>(null);
  const island = useRef<THREE.Group>(null);
  const rim = useRef<THREE.Mesh>(null);
  const aura = useRef<THREE.Mesh>(null);
  const tilt = useRef({ x: 0, y: 0 });
  const reveal = useRef(0);

  const geometry = useMemo(
    () => ({
      frame: buildFrameGeometry(),
      rim: buildRimGeometry(),
      island: buildIslandGeometry(),
      sun: new THREE.SphereGeometry(SUN.radius, 64, 48),
      dot: new THREE.SphereGeometry(0.055, 20, 16),
    }),
    [],
  );
  const materials = useMemo(makeChromeMaterials, []);
  const auraMap = useMemo(makeAuraTexture, []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const step = Math.min(dt, 0.05);
    const p = scrollState.p;

    // Everything the mark does is a function of how committed the camera is.
    const approach = range(p, PHASE.hold[1], PHASE.portal[1]);
    const eased = smoothstep(approach);

    // Cull once we are through and looking the other way.
    const past = p > 0.34;
    g.visible = !past;
    if (past) return;

    reveal.current = damp(reveal.current, 1, 1.6, step);
    const t = performance.now() / 1000;

    // Sits high while the copy occupies the lower half, then drops onto the
    // lens axis so the camera flies through the middle of the opening.
    g.position.y = lift * (1 - eased);
    g.scale.setScalar(fit);

    // Idle: slow, expensive, barely-there movement. Dies off as we approach.
    const calm = 1 - eased;
    tilt.current.x = damp(tilt.current.x, -scrollState.pointerY * 0.16 * calm, 3, step);
    tilt.current.y = damp(tilt.current.y, scrollState.pointerX * 0.22 * calm, 3, step);

    const i = inner.current;
    if (i) {
      i.rotation.y = Math.sin(t * 0.34) * 0.15 * calm + tilt.current.y;
      i.rotation.x = Math.sin(t * 0.27 + 1.1) * 0.075 * calm + tilt.current.x;
      i.rotation.z = Math.sin(t * 0.21) * 0.022 * calm;
      i.position.y = Math.sin(t * 0.52) * 0.055 * calm;
      // Grows into the frame just before we pass through it.
      const swell = 1 + eased * 0.14;
      i.scale.setScalar(swell * (0.94 + 0.06 * reveal.current));
    }

    // The sun rises out of the corridor; the island sinks below it.
    const part = eased * eased;
    if (sun.current) {
      sun.current.position.set(
        SUN.position[0] + part * 0.55,
        SUN.position[1] + part * 4.4,
        part * 3.6,
      );
      sun.current.scale.setScalar(1 + part * 0.5);
    }
    if (island.current) {
      island.current.position.set(-part * 0.3, -part * 3.9, part * 3.2);
      island.current.rotation.z = Math.PI + part * 0.34;
    }

    // Light in the opening. The rim rides the frame all the way in; the glow
    // behind it is spent before the lens reaches it, so we never fly through a
    // billboard — the cut to white is the DOM flash, not this.
    const glow = smoothstep(range(p, 0.085, 0.15));
    if (rim.current) {
      const m = rim.current.material as THREE.MeshBasicMaterial;
      m.opacity = glow * 0.9 * (1 - range(p, 0.235, 0.29));
    }
    if (aura.current) {
      const m = aura.current.material as THREE.MeshBasicMaterial;
      // Spent well before the lens gets near it — it is a glow seen through a
      // doorway, not something we fly into.
      m.opacity = glow * 0.5 * reveal.current * (1 - smoothstep(range(p, 0.13, 0.185)));
    }

    // Fade the metal up from pure black on first paint.
    const opacity = reveal.current;
    materials.frame.opacity = opacity;
    materials.sun.opacity = opacity;
    materials.island.opacity = opacity;
    const transparent = opacity < 0.995;
    if (materials.frame.transparent !== transparent) {
      for (const m of [materials.frame, materials.sun, materials.island]) {
        m.transparent = transparent;
        m.needsUpdate = true;
      }
    }
  });

  return (
    <group ref={group}>
      <group ref={inner}>
        <mesh geometry={geometry.frame} material={materials.frame} />

        {/* Light bleeding out of the opening. */}
        <mesh ref={rim} geometry={geometry.rim}>
          <meshBasicMaterial
            color={ACCENT.sky}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        <mesh ref={sun} geometry={geometry.sun} material={materials.sun} />

        {/* Half turn about X flips the SVG's Y-down space without inverting
            the winding, so the extruded island keeps outward normals. */}
        <group ref={island} rotation={[Math.PI, 0, 0]}>
          <mesh
            geometry={geometry.island}
            material={materials.island}
            scale={[ISLAND_SCALE, ISLAND_SCALE, ISLAND_SCALE]}
          />
        </group>

        {/* The live dot from the badge, kept as a small emissive detail. */}
        <mesh geometry={geometry.dot} position={[1.44, -1.44, FRAME_DEPTH * 0.5 + 0.02]}>
          <meshBasicMaterial color={ACCENT.sky} toneMapped={false} />
        </mesh>
      </group>

      {/* Sits behind the aperture, so the hole reads as depth, not a cut-out.
          Depth-tested on purpose: the frame has to occlude it, or the glow
          spills over the metal instead of shining through the opening. */}
      <mesh ref={aura} position={[0, 0, -3]}>
        <planeGeometry args={[5.2, 5.2]} />
        <meshBasicMaterial
          map={auraMap}
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
