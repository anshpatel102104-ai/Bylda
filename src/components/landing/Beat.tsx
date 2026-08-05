/**
 * ONE TRANSFORMATION
 *
 * A line from the call hangs in front of the camera. The phrase that matters
 * lights up. The sentence comes apart, the meaning streams across the gap, and a
 * finished CRM record assembles itself out of the pieces. Five of these, back to
 * back, are the entire product.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ShardedCard, type ShardUniforms } from "./ShardedCard";
import { makeDotTexture } from "./cardTexture";
import { scrollState } from "./scrollState";
import { ACCENT, BEAT_SPAN, PHASE, mulberry32, range, smoothstep, type Beat } from "./story";

/** Short helper: a value that ramps 0→1 across a slice of the beat. */
const at = (q: number, a: number, b: number) => smoothstep(range(q, a, b));

/* ── the stream of meaning between the two cards ──────────────────────────── */

const STREAM_COUNT = 110;

const STREAM_VERT = /* glsl */ `
  attribute float aSeed;
  uniform vec3 uFrom;
  uniform vec3 uTo;
  uniform float uTime;
  uniform float uAmt;
  uniform float uSize;
  varying float vAlpha;

  void main() {
    float t = fract(aSeed + uTime * 0.42);
    vec3 p = mix(uFrom, uTo, t);
    // Bow the path so the stream reads as a flow rather than a straight wire.
    float arc = sin(t * 3.14159);
    p.y += arc * (0.55 + aSeed * 0.9) * (aSeed > 0.5 ? 1.0 : -0.6);
    p.z += arc * (aSeed - 0.5) * 1.4;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (1.0 + aSeed) * (30.0 / max(-mv.z, 1.0));
    vAlpha = uAmt * sin(t * 3.14159) * (0.35 + aSeed * 0.65);
  }
`;

const STREAM_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float mask = texture2D(uMap, gl_PointCoord).a;
    if (vAlpha * mask < 0.01) discard;
    gl_FragColor = vec4(uColor, vAlpha * mask);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

type StreamHandle = {
  uFrom: THREE.IUniform<THREE.Vector3>;
  uTo: THREE.IUniform<THREE.Vector3>;
  uTime: THREE.IUniform<number>;
  uAmt: THREE.IUniform<number>;
  uSize: THREE.IUniform<number>;
  uColor: THREE.IUniform<THREE.Color>;
  uMap: THREE.IUniform<THREE.Texture>;
};

function useStream(color: string, seed: number) {
  return useMemo(() => {
    const rand = mulberry32(seed);
    const seeds = new Float32Array(STREAM_COUNT);
    const positions = new Float32Array(STREAM_COUNT * 3);
    for (let i = 0; i < STREAM_COUNT; i++) seeds[i] = rand();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);

    const uniforms: StreamHandle = {
      uFrom: { value: new THREE.Vector3() },
      uTo: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uAmt: { value: 0 },
      uSize: { value: 2.4 },
      uColor: { value: new THREE.Color(color) },
      uMap: { value: makeDotTexture() },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: STREAM_VERT,
      fragmentShader: STREAM_FRAG,
      uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry, material, uniforms };
  }, [color, seed]);
}

/* ── the beat ─────────────────────────────────────────────────────────────── */

export function BeatScene({
  beat,
  index,
  z,
  fit = 1,
  portrait = false,
}: {
  beat: Beat;
  index: number;
  z: number;
  /** Narrow-viewport correction: pulls the pair in and shrinks the cards. */
  fit?: number;
  /** On a phone the pair stacks down the middle instead of sitting side by side. */
  portrait?: boolean;
}) {
  const mirrored = index % 2 === 1;
  const side = mirrored ? -1 : 1;
  const cardWidth = portrait ? 3.0 : 5.1 * fit;

  // Far enough down the corridor that the pair is framed, not flown into: the
  // camera reaches the beat's station roughly as the record finishes building.
  const saidPos = useMemo<[number, number, number]>(
    () => (portrait ? [0, 1.7, z - 10] : [-2.75 * side * fit, 1.05 * fit, z - 10]),
    [portrait, side, fit, z],
  );
  const becamePos = useMemo<[number, number, number]>(
    () => (portrait ? [0, -1.75, z - 15.5] : [2.85 * side * fit, -1.0 * fit, z - 15.5]),
    [portrait, side, fit, z],
  );
  const breakDir = useMemo<[number, number, number]>(() => [side * 1, 0.15, 0.55], [side]);
  const buildDir = useMemo<[number, number, number]>(() => [side * 0.6, -0.4, 0.9], [side]);

  const saidU = useRef<ShardUniforms | null>(null);
  const becameU = useRef<ShardUniforms | null>(null);
  const becameMesh = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);

  const stream = useStream(ACCENT[beat.became.accent], 900 + index * 37);

  // Windows overlap slightly so one beat is still settling as the next opens.
  const from = PHASE.beats[0] + index * BEAT_SPAN - 0.015;
  const to = PHASE.beats[0] + (index + 1) * BEAT_SPAN + 0.02;

  useFrame((_, dt) => {
    const q = range(scrollState.p, from, to);
    const g = group.current;
    if (!g) return;

    // Nothing to draw outside the window.
    const live = q > 0.0001 && q < 0.9999;
    g.visible = live;
    if (!live) {
      stream.uniforms.uAmt.value = 0;
      return;
    }

    // Clears out before the lens closes on it — an off-frame card reads as a
    // mistake, not as motion.
    const exit = 1 - at(q, 0.84, 0.97);

    // The line arrives and is written out.
    const said = saidU.current;
    if (said) {
      said.uReveal.value = at(q, 0.02, 0.24);
      said.uOpacity.value = at(q, 0.0, 0.1) * (1 - at(q, 0.74, 0.88)) * exit;
      said.uHighlightAmt.value = at(q, 0.26, 0.36);
      said.uBreak.value = at(q, 0.4, 0.74);
    }

    // The record builds itself out of what came across.
    const became = becameU.current;
    if (became) {
      became.uOpacity.value = at(q, 0.44, 0.6) * exit;
      became.uBreak.value = 1 - at(q, 0.46, 0.78);
      became.uReveal.value = 1;
      // A pulse the moment it locks.
      became.uHighlightAmt.value = 0;
    }

    // Lock: a short scale pop plus a bloom behind the finished record.
    const lock = at(q, 0.72, 0.8) * (1 - at(q, 0.8, 0.98));
    if (becameMesh.current) becameMesh.current.scale.setScalar(1 + lock * 0.045);
    if (halo.current) {
      const m = halo.current.material as THREE.MeshBasicMaterial;
      m.opacity = (lock * 0.26 + at(q, 0.6, 0.8) * 0.09) * exit;
    }

    // Meaning in transit.
    stream.uniforms.uTime.value += dt;
    stream.uniforms.uAmt.value = at(q, 0.44, 0.56) * (1 - at(q, 0.76, 0.9));
    stream.uniforms.uFrom.value.set(...saidPos);
    stream.uniforms.uTo.value.set(...becamePos);
  });

  return (
    <group ref={group}>
      <ShardedCard
        spec={beat.said}
        width={cardWidth}
        position={saidPos}
        rotation={portrait ? [0.12, 0, 0] : [0.03, side * 0.34, side * 0.012]}
        dir={breakDir}
        spread={3.1}
        seed={11 + index * 13}
        highlightColor={ACCENT[beat.became.accent]}
        uniformsRef={saidU}
      />

      <ShardedCard
        spec={beat.became}
        width={cardWidth * 0.96}
        position={becamePos}
        rotation={portrait ? [-0.12, 0, 0] : [-0.04, -side * 0.32, -side * 0.01]}
        dir={buildDir}
        spread={2.7}
        seed={57 + index * 19}
        uniformsRef={becameU}
        meshRef={becameMesh}
      />

      {/* Bloom behind the finished record. */}
      <mesh ref={halo} position={becamePos} rotation={[0, portrait ? 0 : -side * 0.32, 0]}>
        <planeGeometry args={[cardWidth * 1.5, cardWidth * 1.1]} />
        <meshBasicMaterial
          map={makeDotTexture()}
          color={ACCENT[beat.became.accent]}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <points geometry={stream.geometry} material={stream.material} frustumCulled={false} />
    </group>
  );
}
