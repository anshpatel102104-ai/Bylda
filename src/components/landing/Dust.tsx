/**
 * Air.
 *
 * A slow drift of lit particles so the black is a volume rather than a
 * backdrop — it gives the mark something to float in, and the flight through the
 * corridor something to measure speed against. Positions wrap relative to the
 * camera in the vertex shader, so a few thousand points cover the whole journey
 * with no CPU work per frame.
 */
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { makeDotTexture } from "./cardTexture";
import { mulberry32 } from "./story";

const SPAN = 130;

const VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uCamZ;
  uniform float uSpan;
  uniform float uSize;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    // Always ahead of the lens: depth wraps into a band in front of the camera.
    float depth = mod(p.z + uTime * 1.4, uSpan);
    p.z = uCamZ + 4.0 - depth;
    p.x += sin(uTime * 0.22 + aSeed * 31.4) * 0.5;
    p.y += cos(uTime * 0.18 + aSeed * 17.7) * 0.5;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = max(-mv.z, 0.6);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.4 + aSeed) * (26.0 / dist);

    // In from the far dark, out again as it passes the lens.
    float near = smoothstep(1.5, 9.0, dist);
    float far = 1.0 - smoothstep(uSpan * 0.55, uSpan * 0.95, dist);
    vAlpha = near * far * (0.16 + aSeed * 0.5);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    float mask = texture2D(uMap, gl_PointCoord).a;
    float a = vAlpha * mask * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function Dust({ count = 1400 }: { count?: number }) {
  const { camera } = useThree();
  const uniforms = useRef({
    uTime: { value: 0 },
    uCamZ: { value: 0 },
    uSpan: { value: SPAN },
    uSize: { value: 2.6 },
    uMap: { value: makeDotTexture() },
    uColor: { value: new THREE.Color("#cfe9ff") },
    uOpacity: { value: 1 },
  });

  const geometry = useMemo(() => {
    const rand = mulberry32(4242);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Hollow out the middle so dust never sits on the lens.
      const angle = rand() * Math.PI * 2;
      const radius = 1.4 + Math.pow(rand(), 0.6) * 16;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius * 0.8;
      positions[i * 3 + 2] = rand() * SPAN;
      seeds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: uniforms.current,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useFrame((_, dt) => {
    uniforms.current.uTime.value += Math.min(dt, 0.05);
    uniforms.current.uCamZ.value = camera.position.z;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
