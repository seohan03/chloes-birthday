import {
  Bodies,
  Body,
  Composite,
  Constraint,
  Engine,
  Query,
  Sleeping,
  Vector,
  type IConstraintDefinition,
} from "matter-js";
import { ConfettiRenderer } from "./ConfettiRenderer";
import { makeRandom, PALETTE, particleLimit, PHYSICS } from "./config";
import type { ConfettiAppearance, ConfettiKind, ConfettiParticle } from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** One self-contained physics scene. Created and destroyed by a React effect. */
export class ConfettiSimulation {
  private readonly engine = Engine.create({
    enableSleeping: true,
    positionIterations: PHYSICS.positionIterations,
    velocityIterations: PHYSICS.velocityIterations,
    constraintIterations: PHYSICS.constraintIterations,
  });
  private readonly renderer: ConfettiRenderer;
  private readonly random = makeRandom(0x7a17b4d);
  private readonly particles: ConfettiParticle[] = [];
  private readonly spawnTimes: number[] = [];
  private readonly reducedMotion: boolean;
  private width = 0;
  private height = 0;
  private floor: Body | null = null;
  private leftWall: Body | null = null;
  private rightWall: Body | null = null;
  private scheduledIndex = 0;
  private simulationTime = 0;
  private accumulator = 0;
  private previousFrame: number | null = null;
  private animationFrame = 0;
  private resizeObserver: ResizeObserver | null = null;
  private dragging: Constraint | null = null;
  private dragPointerId: number | null = null;
  private lastHoverImpulse = 0;
  private started = false;
  private destroyed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly interactionArea: HTMLDivElement,
    reducedMotion: boolean,
  ) {
    this.reducedMotion = reducedMotion;
    this.renderer = new ConfettiRenderer(canvas);
    this.engine.gravity.y = PHYSICS.gravity;
    this.engine.gravity.scale = PHYSICS.gravityScale;
  }

  start() {
    if (this.started || this.destroyed) return;
    this.started = true;
    this.resize();
    if (this.reducedMotion) {
      this.createStaticSettledComposition();
    } else {
      this.createSpawnSchedule();
      this.spawnDue(0);
      this.interactionArea.addEventListener("pointerdown", this.onPointerDown);
      this.interactionArea.addEventListener("pointermove", this.onPointerMove);
      this.interactionArea.addEventListener("pointerup", this.onPointerUp);
      this.interactionArea.addEventListener("pointercancel", this.onPointerUp);
      document.addEventListener("visibilitychange", this.onVisibilityChange);
      this.animationFrame = requestAnimationFrame(this.tick);
    }

    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);
    window.addEventListener("resize", this.onResize);
    window.visualViewport?.addEventListener("resize", this.onResize);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    this.releaseDrag();
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.onResize);
    window.visualViewport?.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.interactionArea.removeEventListener("pointerdown", this.onPointerDown);
    this.interactionArea.removeEventListener("pointermove", this.onPointerMove);
    this.interactionArea.removeEventListener("pointerup", this.onPointerUp);
    this.interactionArea.removeEventListener("pointercancel", this.onPointerUp);
    this.interactionArea.style.pointerEvents = "none";
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.particles.length = 0;
  }

  /** Avoid numerical instability on very slow frames / background-tab resumes. */
  private tick = (timestamp: number) => {
    if (this.destroyed) return;
    if (this.previousFrame === null) this.previousFrame = timestamp;
    const frameMs = clamp(timestamp - this.previousFrame, 0, PHYSICS.maxFrameMs);
    this.previousFrame = timestamp;
    this.accumulator += frameMs;

    let steps = 0;
    while (
      this.accumulator >= PHYSICS.fixedStepMs &&
      steps < PHYSICS.maxStepsPerFrame
    ) {
      this.simulationTime += PHYSICS.fixedStepMs;
      this.spawnDue(this.simulationTime);
      Engine.update(this.engine, PHYSICS.fixedStepMs);
      this.accumulator -= PHYSICS.fixedStepMs;
      steps++;
    }
    if (steps === PHYSICS.maxStepsPerFrame) this.accumulator = 0;

    if (
      this.simulationTime >= PHYSICS.interactionStartsMs &&
      this.interactionArea.style.pointerEvents !== "auto"
    ) {
      this.interactionArea.style.pointerEvents = "auto";
    }

    this.renderer.render(this.particles);
    // When the pile is fully asleep, stop all frames. Pointer input can wake it.
    const fullySettled =
      this.simulationTime > 7_000 &&
      !this.dragging &&
      this.particles.every((particle) => particle.body.isSleeping);
    this.animationFrame = fullySettled ? 0 : requestAnimationFrame(this.tick);
  };

  private wakeAnimation() {
    if (this.destroyed || this.reducedMotion || this.animationFrame !== 0) return;
    this.previousFrame = null;
    this.accumulator = 0;
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  private createSpawnSchedule() {
    const count = particleLimit(this.width);
    for (let i = 0; i < count; i++) {
      // 0–1 s: opening scatter; 1–3 s: main shower; 3–5 s: taper.
      // The last pieces enter before 5.2 s and finish falling around 5–7 s.
      const u = i / count;
      let time: number;
      if (u < 0.2) {
        time = (u / 0.2) * 950;
      } else if (u < 0.8) {
        time = 950 + ((u - 0.2) / 0.6) * 2050;
      } else if (u < 0.96) {
        time = 3000 + ((u - 0.8) / 0.16) * 1600;
      } else {
        time = 4600 + ((u - 0.96) / 0.04) * 550;
      }
      this.spawnTimes.push(time + this.random() * 34);
    }
    this.spawnTimes[0] = 0;
    this.spawnTimes.sort((a, b) => a - b);
  }

  private spawnDue(time: number) {
    while (
      this.scheduledIndex < this.spawnTimes.length &&
      this.spawnTimes[this.scheduledIndex] <= time
    ) {
      const i = this.scheduledIndex++;
      const a = this.createAppearance();
      const mostlyLeft = i < 8 || this.random() < 0.84;
      const span = mostlyLeft ? 0.34 : 0.62;
      const x = clamp(
        this.width * (0.03 + Math.pow(this.random(), 1.3) * span),
        a.width / 2 + 2,
        this.width - a.width / 2 - 2,
      );
      // Entire collider starts above the visible top edge.
      const y = -Math.max(a.width, a.height) - this.random() * 65;
      const particle = this.addParticle(a, x, y);
      Body.setVelocity(particle.body, {
        x: 0.55 + this.random() * 1.55, // modest rightward drift
        y: this.random() * 0.65,
      });
      Body.setAngularVelocity(particle.body, (this.random() - 0.5) * 0.11);
    }
  }

  private createAppearance(): ConfettiAppearance {
    const r = this.random();
    let kind: ConfettiKind;
    if (r < 0.19) kind = "marble";
    else if (r < 0.35) kind = "faceted";
    else if (r < 0.52) kind = "ring";
    else if (r < 0.71) kind = "flower";
    else if (r < 0.8) kind = "tube";
    else if (r < 0.87) kind = "inlay";
    else if (r < 0.94) kind = "heart";
    else kind = "star";

    const scale = this.width < 480 ? 0.77 : this.width < 768 ? 0.89 : 1;
    const size = (14 + this.random() * 17) * scale;
    let width = size;
    let height = size;
    if (kind === "tube") {
      width = size * 1.7;
      height = size * 0.54;
    } else if (kind === "inlay") {
      width = size * 1.85;
      height = size * 0.48;
    } else if (kind === "flower") {
      width = height = size * 1.1;
    }

    const preferredColors =
      kind === "heart" ? ["#f4a2b8", "#e6b18f", "#e8a7b6"] :
      kind === "star" ? ["#f4a2b8", "#e8a7b6"] :
      kind === "inlay" ? ["#a6d8e7", "#8ed1cb", "#b39bce"] :
      kind === "tube" ? ["#eddd87", "#b39bce", "#abd8bd"] :
      PALETTE;

    return {
      kind,
      width,
      height,
      color: preferredColors[Math.floor(this.random() * preferredColors.length)],
      seed: Math.floor(this.random() * 100000),
    };
  }

  private addParticle(appearance: ConfettiAppearance, x: number, y: number) {
    const options = {
      label: `confetti:${appearance.kind}`,
      restitution: PHYSICS.restitution,
      friction: PHYSICS.friction,
      frictionStatic: PHYSICS.frictionStatic,
      frictionAir: PHYSICS.frictionAir,
      density: PHYSICS.density,
      sleepThreshold: PHYSICS.sleepThreshold,
    };

    let body: Body;
    if (appearance.kind === "tube" || appearance.kind === "inlay") {
      body = Bodies.rectangle(x, y, appearance.width, appearance.height, {
        ...options,
        chamfer: { radius: Math.min(appearance.height * 0.25, 3) },
      });
    } else if (appearance.kind === "star" || appearance.kind === "heart") {
      // Convex approximations keep contact solving cheap. The sprite supplies
      // the visually complex silhouette, never an animated DOM element.
      body = Bodies.polygon(x, y, appearance.kind === "star" ? 5 : 6,
        appearance.width * 0.45, options);
    } else {
      body = Bodies.circle(x, y, appearance.width * 0.49, options);
    }

    Body.setAngle(body, this.random() * Math.PI * 2);
    Composite.add(this.engine.world, body);
    const particle = {
      body,
      appearance,
      sprite: this.renderer.createSprite(appearance),
    };
    this.particles.push(particle);
    return particle;
  }

  private createStaticSettledComposition() {
    // Reduced motion: run contacts offscreen synchronously, draw once, never RAF.
    const count = particleLimit(this.width);
    const occupiedWidth = Math.min(this.width * 0.79, 640);
    const columns = Math.max(3, Math.floor(occupiedWidth / 24));
    const gap = occupiedWidth / columns;
    for (let i = 0; i < count; i++) {
      const a = this.createAppearance();
      const column = i % columns;
      const row = Math.floor(i / columns);
      const x = 12 + (column + 0.45) * gap + (this.random() - 0.5) * 6;
      const y = this.height - 22 - row * 27 + (this.random() - 0.5) * 6;
      this.addParticle(a, clamp(x, a.width / 2, this.width - a.width / 2), y);
    }
    for (let i = 0; i < 300; i++) {
      Engine.update(this.engine, PHYSICS.fixedStepMs);
    }
    this.renderer.render(this.particles);
  }

  private createWalls() {
    const t = PHYSICS.wallThickness;
    const wallSettings = {
      isStatic: true,
      friction: 0.82,
      restitution: 0.12,
      label: "invisible boundary",
    };
    this.floor = Bodies.rectangle(
      this.width / 2,
      this.height + t / 2,
      this.width + t * 2,
      t,
      wallSettings,
    );
    this.leftWall = Bodies.rectangle(-t / 2, this.height / 2, t, this.height * 3 + t, wallSettings);
    this.rightWall = Bodies.rectangle(
      this.width + t / 2,
      this.height / 2,
      t,
      this.height * 3 + t,
      wallSettings,
    );
    Composite.add(this.engine.world, [this.floor, this.leftWall, this.rightWall]);
  }

  private onResize = () => this.resize();

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (width === this.width && height === this.height) return;
    const oldWidth = this.width;
    const oldHeight = this.height;
    this.width = width;
    this.height = height;
    this.renderer.resize(width, height);
    if (!this.floor || !this.leftWall || !this.rightWall) {
      this.createWalls();
      return;
    }

    const t = PHYSICS.wallThickness;
    Body.scale(this.floor, (width + 2 * t) / (oldWidth + 2 * t), 1);
    Body.setPosition(this.floor, { x: width / 2, y: height + t / 2 });
    const wallScale = (height * 3 + t) / (oldHeight * 3 + t);
    Body.scale(this.leftWall, 1, wallScale);
    Body.scale(this.rightWall, 1, wallScale);
    Body.setPosition(this.leftWall, { x: -t / 2, y: height / 2 });
    Body.setPosition(this.rightWall, { x: width + t / 2, y: height / 2 });

    for (const particle of this.particles) {
      const { body, appearance } = particle;
      const nearOldFloor = body.position.y > oldHeight - Math.min(250, oldHeight * 0.4);
      const adjustedY = body.position.y + (nearOldFloor ? height - oldHeight : 0);
      const r = Math.max(appearance.width, appearance.height) / 2;
      Body.setPosition(body, {
        x: clamp(body.position.x, r, Math.max(r, width - r)),
        y: adjustedY,
      });
      Sleeping.set(body, false);
    }
    this.renderer.render(this.particles);
    this.wakeAnimation();
  }

  private pointFromEvent(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    // Matter works in CSS pixels; only the painter knows about devicePixelRatio.
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private hitParticle(point: { x: number; y: number }): Body | null {
    const bodies = this.particles.map((particle) => particle.body);
    const directHits = Query.point(bodies, point);
    if (directHits.length > 0) {
      return directHits.reduce((closest, body) =>
        Vector.magnitudeSquared(Vector.sub(body.position, point)) <
        Vector.magnitudeSquared(Vector.sub(closest.position, point)) ? body : closest,
      );
    }
    // A tiny hit slop makes the small beads practical on touchscreens.
    let nearest: Body | null = null;
    let bestDistanceSquared = Infinity;
    for (const particle of this.particles) {
      const distanceSquared = Vector.magnitudeSquared(Vector.sub(particle.body.position, point));
      const hitRadius = Math.max(16, particle.appearance.width * 0.55);
      if (distanceSquared < hitRadius * hitRadius && distanceSquared < bestDistanceSquared) {
        bestDistanceSquared = distanceSquared;
        nearest = particle.body;
      }
    }
    return nearest;
  }

  private onPointerDown = (event: PointerEvent) => {
    if (this.simulationTime < PHYSICS.interactionStartsMs || this.dragging) return;
    const point = this.pointFromEvent(event);
    const body = this.hitParticle(point);
    if (!body) return;
    event.preventDefault();
    Sleeping.set(body, false);
    const localPoint = Vector.rotate(Vector.sub(point, body.position), -body.angle);
    const dragOptions: IConstraintDefinition = {
      label: "visitor drag spring",
      bodyB: body,
      pointA: { ...point },
      pointB: localPoint,
      length: 0,
      stiffness: PHYSICS.dragStiffness,
      damping: PHYSICS.dragDamping,
      render: { visible: false },
    };
    this.dragging = Constraint.create(dragOptions);
    this.dragPointerId = event.pointerId;
    Composite.add(this.engine.world, this.dragging);
    this.wakeAnimation();
    this.interactionArea.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (this.simulationTime < PHYSICS.interactionStartsMs) return;
    const point = this.pointFromEvent(event);
    if (this.dragging && this.dragPointerId === event.pointerId) {
      this.dragging.pointA = point;
      event.preventDefault();
      return;
    }
    if (event.pointerType === "touch" || this.dragging) return;
    if (this.simulationTime - this.lastHoverImpulse < 34) return;
    this.lastHoverImpulse = this.simulationTime;

    const radius = PHYSICS.mouseInfluenceRadius;
    let disturbed = false;
    for (const particle of this.particles) {
      const body = particle.body;
      const offset = Vector.sub(body.position, point);
      const distance = Vector.magnitude(offset);
      if (distance >= radius || distance < 1) continue;
      const strength = Math.pow(1 - distance / radius, 2);
      Sleeping.set(body, false);
      Body.applyForce(body, body.position, {
        x: (offset.x / distance) * body.mass * 0.000075 * strength,
        y: (-0.000052 - Math.abs(offset.y / distance) * 0.000015) * body.mass * strength,
      });
      disturbed = true;
    }
    if (disturbed) this.wakeAnimation();
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.dragPointerId) return;
    this.releaseDrag();
  };

  private releaseDrag() {
    if (this.dragging) {
      Composite.remove(this.engine.world, this.dragging);
      this.dragging = null;
    }
    if (
      this.dragPointerId !== null &&
      this.interactionArea.hasPointerCapture(this.dragPointerId)
    ) {
      this.interactionArea.releasePointerCapture(this.dragPointerId);
    }
    this.dragPointerId = null;
  }

  private onVisibilityChange = () => {
    // Ignore wall-clock time spent in a background tab. Never "fast forward".
    this.previousFrame = null;
    this.accumulator = 0;
  };
}
