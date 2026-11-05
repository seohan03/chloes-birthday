/** All dimensions are CSS pixels; the physics clock uses milliseconds. */
export const PHYSICS = {
  fixedStepMs: 1000 / 60,
  maxFrameMs: 66,
  maxStepsPerFrame: 4,
  gravity: 1.14,
  gravityScale: 0.001,
  positionIterations: 8,
  velocityIterations: 8,
  constraintIterations: 3,
  restitution: 0.28,
  friction: 0.66,
  frictionStatic: 0.82,
  frictionAir: 0.012, // Dampens both linear and angular velocity.
  density: 0.0012,
  sleepThreshold: 65,
  wallThickness: 120,
  maxDpr: 2,
  interactionStartsMs: 6_700,
  mouseInfluenceRadius: 84,
  dragStiffness: 0.18,
  dragDamping: 0.13,
} as const;

export const PALETTE = [
  "#e8a7b6", // dusty pink
  "#a6d8e7", // cloudy blue
  "#b39bce", // lilac
  "#8995cb", // periwinkle
  "#eddd87", // lemon
  "#abd8bd", // mint
  "#8ed1cb", // sea glass
  "#e6b18f", // pale apricot
  "#bfd68b", // pistachio
  "#f4a2b8", // rose
] as const;

export function particleLimit(width: number): number {
  if (width < 480) return 106;
  if (width < 768) return 128;
  if (width < 1100) return 166;
  return 208;
}

/** A small deterministic PRNG keeps the art direction repeatable across mounts. */
export function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
