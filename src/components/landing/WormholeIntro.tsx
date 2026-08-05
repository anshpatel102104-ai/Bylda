/**
 * THE WAY IN
 *
 * The page opens on the Bylda mark, head-on and still, at the proportions it
 * already ships at. Scroll once and the camera falls into the badge: the sun
 * lifts, the island drops, the ring sweeps past the lens, and you are inside it
 * — a chrome tunnel with light bands rushing by. Out the far end, the pin
 * releases and the rest of the page scrolls normally.
 *
 * This is a doorway, not a destination. It owns about a screen and a half of
 * scroll and then gets out of the way.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  ToneMappingMode,
} from "postprocessing";
import * as THREE from "three";
import {
  BADGE,
  ISLAND_SCALE,
  SUN,
  TUNNEL_DEPTH,
  buildBadgeGeometry,
  buildBandGeometry,
  buildIslandGeometry,
  buildTunnelGeometry,
  makeChromeMaterials,
} from "./markGeometry";
import { makeDotTexture } from "./sprites";
import { buildStudioEnvironment } from "./studioEnv";
import { scrollState } from "./scrollState";
import {
  BLUE,
  CAMERA_KEYS,
  INTRO,
  INTRO_LENGTH,
  VOID_COLOR,
  damp,
  mulberry32,
  range,
  sampleKeys,
  smoothstep,
} from "./story";

/* ── The mark, and the tunnel behind it ───────────────────────────────────── */

const BAND_COUNT = 18;

function Mark({ fit }: { fit: number }) {
  const group = useRef<THREE.Group>(null);
  const sun = useRef<THREE.Mesh>(null);
  const island = useRef<THREE.Group>(null);
  const bands = useRef<THREE.InstancedMesh>(null);
  const exit = useRef<THREE.Mesh>(null);
  const tilt = useRef({ x: 0, y: 0 });
  const reveal = useRef(0);

  const geometry = useMemo(
    () => ({
      badge: buildBadgeGeometry(),
      tunnel: buildTunnelGeometry(),
      band: buildBandGeometry(0.06),
      island: buildIslandGeometry(),
      sun: new THREE.SphereGeometry(SUN.radius, 64, 48),
      dot: new THREE.SphereGeometry(0.05, 20, 16),
    }),
    [],
  );
  const materials = useMemo(makeChromeMaterials, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Light bands set into the tunnel wall, evenly spaced down its length.
  const bandZ = useMemo(
    () =>
      Array.from({ length: BAND_COUNT }, (_, i) => -0.7 - (i / BAND_COUNT) * (TUNNEL_DEPTH - 1)),
    [],
  );

  useEffect(() => {
    const mesh = bands.current;
    if (!mesh) return;
    bandZ.forEach((z, i) => {
      dummy.position.set(0, 0, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [bandZ, dummy]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const step = Math.min(dt, 0.05);
    const p = scrollState.p;
    const t = performance.now() / 1000;

    g.scale.setScalar(fit);
    reveal.current = damp(reveal.current, 1, 1.8, step);

    // How committed the camera is to the opening.
    const dive = smoothstep(range(p, INTRO.hold[1], INTRO.tunnel[0]));
    const calm = 1 - dive;

    // Idle: barely-there drift while the logo is being read.
    tilt.current.x = damp(tilt.current.x, -scrollState.pointerY * 0.14 * calm, 3, step);
    tilt.current.y = damp(tilt.current.y, scrollState.pointerX * 0.2 * calm, 3, step);
    g.rotation.y = Math.sin(t * 0.34) * 0.1 * calm + tilt.current.y;
    g.rotation.x = Math.sin(t * 0.27 + 1.1) * 0.05 * calm + tilt.current.x;
    g.position.y = Math.sin(t * 0.52) * 0.05 * calm * fit;

    // The sun rises out of the corridor; the island sinks below it, so the
    // opening is clear by the time the lens reaches it.
    const part = dive * dive;
    if (sun.current) {
      sun.current.position.set(
        SUN.position[0] + part * 0.5,
        SUN.position[1] + part * 4.2,
        part * 3.2,
      );
      sun.current.scale.setScalar(1 + part * 0.4);
    }
    if (island.current) {
      island.current.position.set(-part * 0.25, -part * 3.6, part * 2.8);
      // Roll only. The half turn about X that flips the SVG's Y-down space is
      // set in JSX — adding π here as well cancels it back out and the island
      // lands above the sun instead of under it.
      island.current.rotation.z = part * 0.3;
    }

    // The corridor does not exist until the badge opening already fills the
    // frame. Switched on any earlier and you see a box sitting inside a logo,
    // which is exactly what stops the mark reading as the mark.
    const opened = smoothstep(range(p, 0.4, 0.5));
    materials.tunnel.opacity = opened;
    materials.tunnel.visible = opened > 0.002;

    // Bands rush past once we are inside.
    if (bands.current) {
      bands.current.visible = opened > 0.002;
      const m = bands.current.material as THREE.MeshBasicMaterial;
      m.opacity = opened * (1 - range(p, 0.9, 1.0)) * 0.5;
    }

    // The far end brightens as we close on it, handing off to the cut to white.
    if (exit.current) {
      const m = exit.current.material as THREE.MeshBasicMaterial;
      m.opacity = smoothstep(range(p, 0.42, 0.86)) * 0.85;
      exit.current.visible = m.opacity > 0.002;
    }

    // Fade the metal up from black on first paint.
    const o = reveal.current;
    const transparent = o < 0.995;
    for (const m of [materials.badge, materials.sun, materials.island]) {
      m.opacity = o;
      if (m.transparent !== transparent) {
        m.transparent = transparent;
        m.needsUpdate = true;
      }
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry.badge} material={materials.badge} />
      <mesh geometry={geometry.tunnel} material={materials.tunnel} visible={false} />

      <instancedMesh
        ref={bands}
        args={[geometry.band, undefined, BAND_COUNT]}
        frustumCulled={false}
      >
        <meshBasicMaterial
          color={BLUE}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      <mesh ref={sun} geometry={geometry.sun} material={materials.sun} />

      {/* Half turn about X flips the SVG's Y-down space without inverting the
          winding, so the extruded island keeps outward normals. */}
      <group ref={island} rotation={[Math.PI, 0, 0]}>
        <mesh
          geometry={geometry.island}
          material={materials.island}
          scale={[ISLAND_SCALE, ISLAND_SCALE, ISLAND_SCALE]}
        />
      </group>

      {/* The live dot from the badge, kept as a small emissive detail. */}
      <mesh geometry={geometry.dot} position={[BADGE * 0.36, -BADGE * 0.36, 0.04]}>
        <meshBasicMaterial color={BLUE} toneMapped={false} />
      </mesh>

      {/* Light at the far end. Without something to fly toward, the tunnel is a
          corridor into nothing; with it, the whiteout reads as an arrival. */}
      <mesh ref={exit} position={[0, 0, -TUNNEL_DEPTH - 0.7]}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial
          map={makeDotTexture()}
          color="#dceaff"
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

/* ── Streaks inside the tube ──────────────────────────────────────────────── */

const STREAK_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSpan;
  uniform float uAmt;
  uniform float uRadius;
  varying float vAlpha;

  void main() {
    float angle = aSeed * 6.2831853;
    float r = uRadius * (0.25 + 0.75 * fract(aSeed * 13.17));
    vec3 p = vec3(cos(angle) * r, sin(angle) * r, 0.0);
    // Runs the length of the tube and recycles, so the flight never runs out.
    p.z = -mod(position.z + uTime * 9.0, uSpan);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = max(-mv.z, 0.4);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aSeed * 3.5) * (26.0 / dist);
    vAlpha = uAmt * (0.25 + 0.75 * aSeed) * smoothstep(0.4, 3.0, dist);
  }
`;

const STREAK_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float mask = texture2D(uMap, gl_PointCoord).a;
    float a = vAlpha * mask;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function Streaks({ fit }: { fit: number }) {
  const uniforms = useRef({
    uTime: { value: 0 },
    uSpan: { value: TUNNEL_DEPTH + 4 },
    uAmt: { value: 0 },
    uRadius: { value: 1.5 },
    uMap: { value: makeDotTexture() },
    uColor: { value: new THREE.Color("#dbeeff") },
  });

  const geometry = useMemo(() => {
    const count = 260;
    const rand = mulberry32(9182);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 2] = rand() * (TUNNEL_DEPTH + 4);
      seeds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: STREAK_VERT,
        fragmentShader: STREAK_FRAG,
        uniforms: uniforms.current,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useFrame((_, dt) => {
    uniforms.current.uTime.value += Math.min(dt, 0.05);
    uniforms.current.uRadius.value = 1.5 * fit;
    // Only alive once we are actually inside the badge.
    uniforms.current.uAmt.value =
      smoothstep(range(scrollState.p, 0.34, 0.6)) * (1 - range(scrollState.p, 0.9, 1.0)) * 0.5;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} scale={[1, 1, 1]} />;
}

/* ── Camera ───────────────────────────────────────────────────────────────── */

function Rig({ fit }: { fit: number }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  const parallax = useRef({ x: 0, y: 0 });

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const step = Math.min(dt, 0.05);
    const p = scrollState.p;

    const z = sampleKeys(CAMERA_KEYS, p) * (0.55 + 0.45 * fit);
    const inside = smoothstep(range(p, INTRO.dive[0], INTRO.tunnel[0]));

    // Parallax is generous on the held logo and gone once we are moving.
    parallax.current.x = damp(
      parallax.current.x,
      scrollState.pointerX * 0.5 * (1 - inside),
      3,
      step,
    );
    parallax.current.y = damp(
      parallax.current.y,
      scrollState.pointerY * 0.3 * (1 - inside),
      3,
      step,
    );

    // A gentle wander down the tube so the walls read as passing, not sliding.
    const wander = inside * (1 - range(p, 0.92, 1));
    const x = parallax.current.x + Math.sin(z * 0.4) * 0.16 * wander;
    const y = parallax.current.y + Math.cos(z * 0.31) * 0.12 * wander;

    cam.position.set(x, y, z);
    look.current.set(x * 0.3, y * 0.3, z - 6);
    cam.lookAt(look.current);
    cam.rotation.z = Math.sin(z * 0.22) * 0.06 * wander;

    // Widens as speed picks up, settles as we come out.
    const fov = 42 + smoothstep(range(p, 0.3, 0.7)) * 26 - smoothstep(range(p, 0.86, 1)) * 12;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

/* ── Post ─────────────────────────────────────────────────────────────────── */

function PostFX({ quality }: { quality: "high" | "low" }) {
  const { bloom, aberration } = useMemo(
    () => ({
      bloom: new BloomEffect({
        blendFunction: BlendFunction.ADD,
        mipmapBlur: true,
        intensity: 0.42,
        luminanceThreshold: 0.72,
        luminanceSmoothing: 0.24,
        radius: quality === "high" ? 0.78 : 0.66,
      }),
      aberration: new ChromaticAberrationEffect({
        offset: new THREE.Vector2(0.00018, 0.00012),
        radialModulation: false,
        modulationOffset: 0,
      }),
    }),
    [quality],
  );

  useEffect(
    () => () => {
      bloom.dispose();
      aberration.dispose();
    },
    [bloom, aberration],
  );

  useFrame(() => {
    const p = scrollState.p;
    const speed = smoothstep(range(p, 0.28, 0.62)) * (1 - smoothstep(range(p, 0.86, 1)));
    bloom.intensity = 0.42 + speed * 0.55;
    const amount = 0.00018 + speed * speed * 0.0013;
    aberration.offset.set(amount, amount * 0.7);
  });

  return (
    <EffectComposer multisampling={quality === "high" ? 4 : 0} enableNormalPass={false}>
      <primitive object={bloom} />
      <primitive object={aberration} />
      <Vignette offset={0.26} darkness={0.85} eskil={false} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.3} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

/** Pre-filters the lighting rig into the environment map the chrome reflects. */
function StudioLight() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const env = buildStudioEnvironment(gl);
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Scene({ quality }: { quality: "high" | "low" }) {
  const size = useThree((s) => s.size);
  // Narrow viewports see the badge sized against width, not height.
  const fit = useMemo(
    () => THREE.MathUtils.clamp((size.width / size.height) * 1.5, 0.62, 1),
    [size.width, size.height],
  );

  return (
    <>
      <color attach="background" args={[VOID_COLOR]} />
      <StudioLight />
      <Rig fit={fit} />
      <Mark fit={fit} />
      <Streaks fit={fit} />
      <PostFX quality={quality} />
    </>
  );
}

/* ── The pinned stage ─────────────────────────────────────────────────────── */

export function WormholeIntro() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"off" | "high" | "low">("off");
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ok = false;
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      ok = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      ok = false;
    }
    if (!ok) return;
    const cores = navigator.hardwareConcurrency ?? 4;
    const narrow = Math.min(window.innerWidth, window.innerHeight) < 640;
    setMode(cores <= 4 || narrow ? "low" : "high");
  }, []);

  useEffect(() => {
    if (mode === "off") return;

    const onPointerMove = (e: PointerEvent) => {
      scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      scrollState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      // The timeline is scrubbed, so scroll position is the clock, not wall
      // time — lag smoothing would let the copy fall behind the camera.
      gsap.ticker.lagSmoothing(0);

      ctx = gsap.context(() => {
        const tl: gsap.core.Timeline = gsap.timeline({
          defaults: { ease: "none" },
          onUpdate: () => {
            scrollState.p = tl.progress();
          },
          scrollTrigger: {
            trigger: stage.current,
            start: "top top",
            end: `+=${INTRO_LENGTH * 100}%`,
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: 0.7,
            invalidateOnRefresh: true,
            // Drop the WebGL context once the doorway is behind us — the rest
            // of the page should not pay for it.
            onLeave: () => setLive(false),
            onEnterBack: () => setLive(true),
          },
        });

        tl.to({}, { duration: 1 }, 0);
        tl.from(".w-cue", { autoAlpha: 0, y: 18, duration: 0.06 }, 0);
        tl.to(".w-cue", { autoAlpha: 0, duration: 0.05 }, 0.1);
        // The cut to white at the far end of the tube.
        tl.to(".w-flash", { opacity: 0.95, duration: 0.035 }, 0.885);
        tl.to(".w-flash", { opacity: 0, duration: 0.06 }, 0.925);
        tl.to(".w-canvas", { opacity: 0, duration: 0.04 }, 0.955);

        return () => {
          gsap.ticker.lagSmoothing(500, 33);
        };
      }, root);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("pointermove", onPointerMove);
      ctx?.revert();
    };
  }, [mode]);

  if (mode === "off") return null;

  return (
    <div ref={root}>
      <style>{`
        .w-stage { position: relative; height: 100vh; height: 100svh; width: 100%; overflow: hidden; background: #000; }
        .w-canvas { position: absolute; inset: 0; z-index: 0; }
        .w-flash { position: absolute; inset: 0; z-index: 2; opacity: 0; pointer-events: none;
          background: radial-gradient(circle at 50% 50%, #ffffff 0%, #cfe6ff 46%, #3b82f6 100%); }
        .w-cue { position: absolute; left: 0; right: 0; bottom: 5vh; margin-inline: auto; z-index: 3;
          width: max-content; display: flex; flex-direction: column; align-items: center; gap: 9px;
          font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
          font-size: 0.62rem; font-weight: 600; letter-spacing: 0.34em; text-transform: uppercase;
          color: rgba(255,255,255,0.34); pointer-events: none; }
        .w-rail { position: relative; display: block; width: 1px; height: 38px; overflow: hidden;
          background: linear-gradient(180deg, rgba(255,255,255,0.16), transparent); }
        .w-rail i { position: absolute; inset-inline: -1px; height: 11px; background: #3b82f6;
          animation: w-fall 2.2s cubic-bezier(0.6,0,0.4,1) infinite; }
        @keyframes w-fall {
          0% { transform: translateY(-12px); opacity: 0; }
          35% { opacity: 1; }
          100% { transform: translateY(40px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .w-rail i { animation: none; } }
      `}</style>

      <div ref={stage} className="w-stage">
        <div className="w-canvas">
          {live && (
            <Canvas
              dpr={[1, mode === "high" ? 2 : 1.4]}
              camera={{ fov: 42, near: 0.4, far: 90, position: [0, 0, 11.5] }}
              gl={{
                antialias: false,
                alpha: false,
                stencil: false,
                powerPreference: "high-performance",
              }}
              onCreated={({ gl }) => {
                gl.toneMapping = THREE.ACESFilmicToneMapping;
                gl.setClearColor(new THREE.Color(VOID_COLOR), 1);
              }}
            >
              <Scene quality={mode} />
            </Canvas>
          )}
        </div>

        <div className="w-cue">
          <span>Scroll</span>
          <span className="w-rail">
            <i />
          </span>
        </div>

        <div className="w-flash" />
      </div>
    </div>
  );
}
