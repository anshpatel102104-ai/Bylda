/**
 * A card that can come apart.
 *
 * The mesh is a grid of independent quads sharing one texture, each carrying its
 * own centre and random seed as vertex attributes. A single `uBreak` uniform
 * drives the whole thing on the GPU, so a card can shatter or assemble itself in
 * one draw call — run it 0 → 1 and the transcript disintegrates, run it 1 → 0
 * and the CRM record builds itself out of the pieces.
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { makeCardTexture } from "./cardTexture";
import { ACCENT, VOID_COLOR, mulberry32, type CardSpec } from "./story";

export type ShardUniforms = {
  uMap: THREE.IUniform<THREE.Texture>;
  uOpacity: THREE.IUniform<number>;
  uBreak: THREE.IUniform<number>;
  uSpread: THREE.IUniform<number>;
  uDir: THREE.IUniform<THREE.Vector3>;
  uReveal: THREE.IUniform<number>;
  uHighlight: THREE.IUniform<THREE.Vector4>;
  uHighlightAmt: THREE.IUniform<number>;
  uAccent: THREE.IUniform<THREE.Color>;
  uHighlightColor: THREE.IUniform<THREE.Color>;
  uFogColor: THREE.IUniform<THREE.Color>;
  uFogDensity: THREE.IUniform<number>;
};

const VERT = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec3 aRand;

  uniform float uBreak;
  uniform float uSpread;
  uniform vec3 uDir;

  varying vec2 vUv;
  varying float vBreak;
  varying float vFogDepth;

  mat2 rot2(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vUv = uv;

    // Stagger per shard so the card comes apart as a wave, not a pop.
    float delay = aRand.z * 0.4;
    float b = clamp((uBreak - delay) / max(1.0 - delay, 0.0001), 0.0, 1.0);
    vBreak = b;

    vec3 local = position - aCenter;
    local.xy = rot2(b * aRand.x * 2.4) * local.xy;
    local *= 1.0 - 0.5 * b;

    vec3 scatter = vec3(aRand.x, aRand.y, aRand.z - 0.5) * uSpread;
    vec3 p = aCenter + local + scatter * b * b + uDir * uSpread * 1.6 * b;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uReveal;
  uniform vec4 uHighlight;
  uniform float uHighlightAmt;
  uniform vec3 uAccent;
  uniform vec3 uHighlightColor;
  uniform vec3 uFogColor;
  uniform float uFogDensity;

  varying vec2 vUv;
  varying float vBreak;
  varying float vFogDepth;

  vec3 toLinear(vec3 c) {
    return mix(pow((c + 0.055) / 1.055, vec3(2.4)), c / 12.92, step(c, vec3(0.04045)));
  }

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    vec3 color = toLinear(tex.rgb);
    float alpha = tex.a;

    // Top-to-bottom wipe with a lit edge riding the boundary: the card is
    // being written, not switched on.
    float row = 1.0 - vUv.y;
    float wipe = 1.0 - smoothstep(uReveal, uReveal + 0.05, row);
    float live = step(0.001, uReveal) * (1.0 - step(0.999, uReveal));
    float edge = exp(-pow((row - uReveal) * 22.0, 2.0)) * live;
    alpha *= wipe;
    color += uAccent * edge * 0.9;

    // The phrase that mattered. Washed in behind the glyphs rather than over
    // them: the accent lifts the dark panel and leaves the words legible,
    // which is what a highlighter actually does.
    vec2 lo = smoothstep(uHighlight.xy - 0.006, uHighlight.xy + 0.006, vUv);
    vec2 hi = 1.0 - smoothstep(uHighlight.zw - 0.006, uHighlight.zw + 0.006, vUv);
    float inH = lo.x * lo.y * hi.x * hi.y;
    float lit = dot(color, vec3(0.299, 0.587, 0.114));
    float wash = inH * uHighlightAmt * (1.0 - smoothstep(0.04, 0.35, lit));
    // Mixed toward the accent rather than added to it, so the band keeps its
    // hue instead of blowing out to white under bloom.
    color = mix(color, uHighlightColor * 0.42, wash * 0.85);
    alpha = max(alpha, wash * 0.5);

    // Scattered shards fade out — except the highlighted ones, which survive
    // long enough to carry the meaning across to the record.
    float life = mix(
      1.0 - smoothstep(0.05, 0.80, vBreak),
      1.0 - smoothstep(0.55, 1.00, vBreak),
      inH
    );
    alpha *= uOpacity * life;
    if (alpha < 0.004) discard;

    float fog = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
    color = mix(color, uFogColor, clamp(fog, 0.0, 1.0));

    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Builds `cols × rows` free-floating quads covering a `w × h` card. */
function buildShardGeometry(w: number, h: number, cols: number, rows: number, seed: number) {
  const rand = mulberry32(seed);
  const quads = cols * rows;
  const position = new Float32Array(quads * 4 * 3);
  const uv = new Float32Array(quads * 4 * 2);
  const center = new Float32Array(quads * 4 * 3);
  const random = new Float32Array(quads * 4 * 3);
  const index = new Uint16Array(quads * 6);

  let v = 0;
  let f = 0;
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const x0 = (ix / cols - 0.5) * w;
      const x1 = ((ix + 1) / cols - 0.5) * w;
      const y0 = (iy / rows - 0.5) * h;
      const y1 = ((iy + 1) / rows - 0.5) * h;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const r = [(rand() - 0.5) * 2, (rand() - 0.5) * 2, rand()];

      const corners: [number, number, number, number][] = [
        [x0, y0, ix / cols, iy / rows],
        [x1, y0, (ix + 1) / cols, iy / rows],
        [x1, y1, (ix + 1) / cols, (iy + 1) / rows],
        [x0, y1, ix / cols, (iy + 1) / rows],
      ];
      for (const [px, py, u, vv] of corners) {
        position.set([px, py, 0], v * 3);
        uv.set([u, vv], v * 2);
        center.set([cx, cy, 0], v * 3);
        random.set(r, v * 3);
        v++;
      }
      const base = v - 4;
      index.set([base, base + 1, base + 2, base + 2, base + 3, base], f);
      f += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute("aCenter", new THREE.BufferAttribute(center, 3));
  geometry.setAttribute("aRand", new THREE.BufferAttribute(random, 3));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export type ShardedCardProps = {
  spec: CardSpec;
  /** Card width in world units. Height follows the texture's aspect. */
  width: number;
  /** Direction the shards are thrown when the card breaks. */
  dir?: [number, number, number];
  spread?: number;
  cols?: number;
  rows?: number;
  seed?: number;
  /**
   * Colour of the highlighted phrase. Defaults to the card's own accent; beats
   * pass the accent of the record the phrase is about to become, so the
   * highlight already tells you where the sentence is going.
   */
  highlightColor?: string;
  /** Receives the live uniform block so a parent can drive the animation. */
  uniformsRef?: { current: ShardUniforms | null };
  /** Receives the mesh so the parent can move it around. */
  meshRef?: React.Ref<THREE.Mesh>;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

export function ShardedCard({
  spec,
  width,
  dir = [1, 0.25, 0.4],
  spread = 2.6,
  cols = 9,
  rows = 6,
  seed = 1,
  highlightColor,
  uniformsRef,
  meshRef,
  position,
  rotation,
}: ShardedCardProps) {
  const card = useMemo(() => makeCardTexture(spec, 1024), [spec]);
  const [dx, dy, dz] = dir;

  const { geometry, material, uniforms } = useMemo(() => {
    const height = width / card.aspect;
    const geo = buildShardGeometry(width, height, cols, rows, seed);
    const h = card.highlight;
    const u: ShardUniforms = {
      uMap: { value: card.texture },
      uOpacity: { value: 0 },
      uBreak: { value: 0 },
      uSpread: { value: spread },
      uDir: { value: new THREE.Vector3(dx, dy, dz).normalize() },
      uReveal: { value: 1 },
      uHighlight: {
        value: h ? new THREE.Vector4(h.x0, h.y0, h.x1, h.y1) : new THREE.Vector4(2, 2, 2, 2),
      },
      uHighlightAmt: { value: 0 },
      uAccent: { value: new THREE.Color(ACCENT[spec.accent]) },
      uHighlightColor: { value: new THREE.Color(highlightColor ?? ACCENT[spec.accent]) },
      uFogColor: { value: new THREE.Color(VOID_COLOR) },
      uFogDensity: { value: 0.0175 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: u as unknown as Record<string, THREE.IUniform>,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return { geometry: geo, material: mat, uniforms: u };
  }, [card, width, cols, rows, seed, spread, dx, dy, dz, spec.accent, highlightColor]);

  useEffect(() => {
    if (uniformsRef) uniformsRef.current = uniforms;
    return () => {
      if (uniformsRef) uniformsRef.current = null;
    };
  }, [uniforms, uniformsRef]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={position}
      rotation={rotation}
    />
  );
}
