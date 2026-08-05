/**
 * THE CAMERA MOVE
 *
 * One shot, no cuts. The lens holds on the mark, falls into its opening, widens
 * through the transit, then settles and travels the corridor. Scroll drives
 * position; time only ever adds the small amount of drift that keeps a held
 * frame from looking frozen.
 */
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { scrollState } from "./scrollState";
import { CAMERA_KEYS, PHASE, damp, range, sampleKeys, smoothstep } from "./story";

const BASE_FOV = 38;
const INSIDE_FOV = 47;

export function Rig() {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  const parallax = useRef({ x: 0, y: 0 });

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const step = Math.min(dt, 0.05);
    const p = scrollState.p;
    const t = performance.now() / 1000;

    const z = sampleKeys(CAMERA_KEYS, p);

    // How far past the aperture we are — gates every "inside" behaviour.
    const inside = smoothstep(range(p, PHASE.portal[0], PHASE.field[0] + 0.05));
    // A short spike centred on the moment of passing through.
    const transit = Math.sin(Math.PI * range(p, PHASE.approach[1] - 0.03, PHASE.portal[1] + 0.02));

    // The last stretch is a composed frame, not a flight: drift and roll are
    // damped out so the board the visitor lands on sits square to the lens.
    const settle = 1 - smoothstep(range(p, 0.87, 0.97));

    // Pointer parallax: generous while the mark is being admired, restrained in
    // flight so it never fights the scroll.
    parallax.current.x = damp(
      parallax.current.x,
      scrollState.pointerX * (0.75 - 0.55 * inside) * (0.35 + 0.65 * settle),
      3.2,
      step,
    );
    parallax.current.y = damp(
      parallax.current.y,
      scrollState.pointerY * (0.42 - 0.3 * inside) * (0.35 + 0.65 * settle),
      3.2,
      step,
    );

    // Hand-held drift once we are travelling, keyed to distance so it reads as
    // the corridor bending rather than the camera wandering.
    const wander = inside * settle;
    const driftX = (Math.sin(z * 0.085) * 0.85 + Math.sin(t * 0.23) * 0.12) * wander;
    const driftY = (Math.cos(z * 0.062) * 0.5 + Math.cos(t * 0.19) * 0.09) * wander;

    cam.position.set(driftX + parallax.current.x, driftY + parallax.current.y, z);

    look.current.set(driftX * 0.4 + parallax.current.x * 0.3, driftY * 0.4, z - 9);
    cam.lookAt(look.current);

    // Roll: a slow bank through the transit, easing off inside.
    cam.rotation.z = transit * 0.19 + Math.sin(z * 0.043) * 0.032 * wander;

    const fov = BASE_FOV + (INSIDE_FOV - BASE_FOV) * inside + transit * 22;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
