import type { Body } from "matter-js";

export type ConfettiKind =
  | "marble"
  | "faceted"
  | "ring"
  | "flower"
  | "tube"
  | "inlay"
  | "heart"
  | "star";

export type ConfettiAppearance = {
  kind: ConfettiKind;
  width: number;
  height: number;
  color: string;
  seed: number;
};

export type ConfettiParticle = {
  body: Body;
  appearance: ConfettiAppearance;
  sprite: HTMLCanvasElement;
};
