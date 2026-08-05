/**
 * The scene graph, assembled.
 *
 * Everything here is driven by one scrubbed number. Nothing re-renders during
 * the scroll — React builds the graph once and the frame loop moves it.
 */
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  ToneMappingMode,
} from "postprocessing";
import * as THREE from "three";
import { BeatScene } from "./Beat";
import { ByldaMark } from "./ByldaMark";
import { DataField } from "./DataField";
import { Dust } from "./Dust";
import { ResolveWall } from "./ResolveWall";
import { Rig } from "./Rig";
import { buildStudioEnvironment } from "./studioEnv";
import { scrollState } from "./scrollState";
import { BEATS, BEAT_Z, PHASE, VOID_COLOR, range, smoothstep } from "./story";

export type Quality = "high" | "low";

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

/**
 * Post chain. Bloom and aberration are pushed hard through the transit and
 * pulled back everywhere else — the effect is a moment, not a look.
 */
function PostFX({ quality }: { quality: Quality }) {
  // Built by hand rather than via the declarative wrappers: those key their
  // memo on `JSON.stringify(props)`, and a ref to a live effect would drag the
  // whole effect — render targets and all — through that on every render.
  const { bloom, aberration } = useMemo(
    () => ({
      bloom: new BloomEffect({
        blendFunction: BlendFunction.ADD,
        mipmapBlur: true,
        intensity: 0.62,
        luminanceThreshold: 0.4,
        luminanceSmoothing: 0.3,
        radius: quality === "high" ? 0.82 : 0.7,
      }),
      aberration: new ChromaticAberrationEffect({
        offset: new THREE.Vector2(0.00025, 0.00018),
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
    const transit = Math.sin(
      Math.PI * range(p, PHASE.approach[1] - 0.045, PHASE.portal[1] + 0.025),
    );
    const inside = smoothstep(range(p, PHASE.portal[0], PHASE.field[0] + 0.05));
    const landing = smoothstep(range(p, 0.88, 1.0));

    bloom.intensity = 0.62 + inside * 0.35 + transit * 2.1 + landing * 0.35;

    const amount = 0.00025 + transit * transit * 0.0055;
    aberration.offset.set(amount, amount * 0.72);
  });

  return (
    <EffectComposer multisampling={quality === "high" ? 4 : 0} enableNormalPass={false}>
      <primitive object={bloom} />
      <primitive object={aberration} />
      <Vignette offset={0.24} darkness={0.92} eskil={false} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.32} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

export function Scene({ quality }: { quality: Quality }) {
  const size = useThree((s) => s.size);

  /**
   * Portrait is not a squashed landscape. The corridor narrows, the mark is
   * sized against width rather than height, the hero sits lower because the
   * copy beneath it is shorter, and the beats stack instead of pairing up.
   */
  const layout = useMemo(() => {
    const aspect = size.width / size.height;
    const t = THREE.MathUtils.clamp((aspect - 0.5) / 1.1, 0, 1);
    return {
      portrait: aspect < 1.05,
      fit: THREE.MathUtils.clamp(aspect / 1.6, 0.5, 1.04),
      markFit: THREE.MathUtils.clamp(aspect * 1.85, 0.62, 1),
      heroLift: THREE.MathUtils.lerp(1.1, 2.4, t),
    };
  }, [size.width, size.height]);

  const textureWidth = quality === "high" ? 640 : 448;

  return (
    <>
      <color attach="background" args={[VOID_COLOR]} />
      <fogExp2 attach="fog" args={[VOID_COLOR, 0.0175]} />

      <StudioLight />
      {/* A single key light, for the sharp specular the environment cannot give. */}
      <directionalLight position={[4, 6, 8]} intensity={1.1} />
      <ambientLight intensity={0.12} />

      <Rig />
      <Dust count={quality === "high" ? 1400 : 700} />

      <ByldaMark fit={layout.markFit} lift={layout.heroLift} />
      <DataField fit={layout.fit} textureWidth={textureWidth} />

      {BEATS.map((beat, i) => (
        <BeatScene
          key={beat.id}
          beat={beat}
          index={i}
          z={BEAT_Z[i]}
          fit={layout.fit}
          portrait={layout.portrait}
        />
      ))}

      <ResolveWall fit={layout.fit} portrait={layout.portrait} textureWidth={textureWidth} />

      <PostFX quality={quality} />
    </>
  );
}
