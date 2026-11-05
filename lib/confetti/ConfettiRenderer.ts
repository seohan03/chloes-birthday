import type { ConfettiAppearance, ConfettiParticle } from "./types";
import { PHYSICS } from "./config";

const SPRITE_SCALE = 2;

function rgba(hex: string, opacity: number): string {
  const raw = hex.replace("#", "");
  const n = parseInt(raw, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Canvas artwork, entirely independent from Matter's simulation loop. */
export class ConfettiRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("The browser does not support Canvas 2D.");
    this.ctx = ctx;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, PHYSICS.maxDpr);
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
  }

  /** Render a watercolor-like bead once, then reuse the tiny sprite every frame. */
  createSprite(a: ConfettiAppearance): HTMLCanvasElement {
    const side = Math.ceil(Math.max(a.width, a.height) * 1.6 + 16);
    const sprite = document.createElement("canvas");
    sprite.width = side * SPRITE_SCALE;
    sprite.height = side * SPRITE_SCALE;
    const ctx = sprite.getContext("2d");
    if (!ctx) throw new Error("Unable to create a confetti sprite.");
    ctx.translate(sprite.width / 2, sprite.height / 2);
    ctx.scale(SPRITE_SCALE, SPRITE_SCALE);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (a.kind) {
      case "marble":
        this.drawMarble(ctx, a);
        break;
      case "faceted":
        this.drawFaceted(ctx, a);
        break;
      case "ring":
        this.drawRing(ctx, a);
        break;
      case "flower":
        this.drawFlower(ctx, a);
        break;
      case "tube":
        this.drawTube(ctx, a, false);
        break;
      case "inlay":
        this.drawTube(ctx, a, true);
        break;
      case "heart":
        this.drawHeart(ctx, a);
        break;
      case "star":
        this.drawStar(ctx, a);
        break;
    }
    this.addPaperTexture(ctx, a);
    return sprite;
  }

  private addPaperTexture(ctx: CanvasRenderingContext2D, a: ConfettiAppearance) {
    // Restrict quiet watercolor flecks to the silhouette already on the sprite.
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 19; i++) {
      const q = Math.sin(a.seed * 0.37 + i * 12.9898) * 43758.5453;
      const p = Math.sin(a.seed * 0.71 + i * 8.712) * 12345.786;
      const x = ((q - Math.floor(q)) - 0.5) * a.width;
      const y = ((p - Math.floor(p)) - 0.5) * a.height;
      const radius = 0.25 + (i % 5) * 0.25;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.35, radius, i * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.20)" : rgba(a.color, 0.15);
      ctx.fill();
    }
    ctx.restore();
  }

  render(particles: readonly ConfettiParticle[]) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    const ctx = this.ctx;

    for (const particle of particles) {
      const { body, sprite } = particle;
      if (
        body.position.y < -60 ||
        body.position.y > this.height + 60 ||
        body.position.x < -60 ||
        body.position.x > this.width + 60
      ) {
        continue;
      }
      const side = sprite.width / SPRITE_SCALE;
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      ctx.drawImage(sprite, -side / 2, -side / 2, side, side);
      ctx.restore();
    }
  }

  private softFill(ctx: CanvasRenderingContext2D, a: ConfettiAppearance) {
    const r = Math.max(a.width, a.height) * 0.7;
    const gradient = ctx.createRadialGradient(
      -a.width * 0.25,
      -a.height * 0.27,
      0,
      0,
      0,
      r,
    );
    gradient.addColorStop(0, rgba(a.color, 0.51));
    gradient.addColorStop(0.55, rgba(a.color, 0.67));
    gradient.addColorStop(1, rgba(a.color, 0.83));
    ctx.fillStyle = gradient;
  }

  private drawMarble(ctx: CanvasRenderingContext2D, a: ConfettiAppearance) {
    const rx = a.width / 2;
    const ry = a.height / 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    this.softFill(ctx, a);
    ctx.fill();
    ctx.strokeStyle = rgba(a.color, 0.45);
    ctx.lineWidth = 0.75;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(-rx * 0.3, -ry * 0.41, rx * 0.23, ry * 0.12, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.29)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rx * 0.23, ry * 0.54, Math.max(0.7, rx * 0.045), 0, Math.PI * 2);
    ctx.fillStyle = rgba("#ffffff", 0.38);
    ctx.fill();
  }

  private drawFaceted(ctx: CanvasRenderingContext2D, a: ConfettiAppearance) {
    const r = a.width / 2;
    this.drawMarble(ctx, a);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
    ctx.clip();

    const tile = r * 0.45;
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        const jitter = Math.sin(a.seed * 0.1 + x * 3.7 + y * 7.9);
        const px = x * tile + jitter * 0.07 * tile;
        const py = y * tile + jitter * 0.09 * tile;
        ctx.beginPath();
        ctx.moveTo(px, py - tile * 0.47);
        ctx.lineTo(px + tile * 0.49, py - tile * 0.27);
        ctx.lineTo(px + tile * 0.36, py + tile * 0.43);
        ctx.lineTo(px - tile * 0.39, py + tile * 0.35);
        ctx.closePath();
        ctx.fillStyle = (x + y) % 3 === 0
          ? "rgba(255,255,255,0.29)"
          : rgba(a.color, 0.22);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.24)";
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawRing(ctx: CanvasRenderingContext2D, a: ConfettiAppearance) {
    const r = a.width / 2;
    const hole = r * 0.39;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 2 * Math.PI);
    ctx.arc(0, 0, hole, 0, 2 * Math.PI, true);
    this.softFill(ctx, a);
    ctx.fill("evenodd");
    ctx.strokeStyle = rgba(a.color, 0.47);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.96, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, hole, 0, 2 * Math.PI);
    ctx.strokeStyle = rgba("#ffffff", 0.75);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const t = i * 2.4 + a.seed;
      const rr = (r + hole) * 0.52;
      ctx.beginPath();
      ctx.arc(Math.cos(t) * rr, Math.sin(t) * rr, Math.max(0.45, r * 0.055), 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fill();
    }
  }

  private drawFlower(ctx: CanvasRenderingContext2D, a: ConfettiAppearance) {
    const petals = a.seed % 3 === 0 ? 6 : 5;
    const r = a.width / 2;
    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / petals);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.5, r * 0.33, r * 0.52, 0, 0, Math.PI * 2);
      this.softFill(ctx, a);
      ctx.fill();
      ctx.strokeStyle = rgba(a.color, 0.53);
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.05, -r * 0.33);
      ctx.quadraticCurveTo(-r * 0.2, -r * 0.63, -r * 0.04, -r * 0.78);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.19, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.fill();
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = rgba(a.color, 0.6);
    ctx.stroke();
  }

  private drawTube(ctx: CanvasRenderingContext2D, a: ConfettiAppearance, gold: boolean) {
    const x = -a.width / 2;
    const y = -a.height / 2;
    roundedRect(ctx, x, y, a.width, a.height, gold ? 2.4 : a.height * 0.44);
    this.softFill(ctx, a);
    ctx.fill();
    ctx.strokeStyle = gold ? "rgba(187,146,74,0.88)" : rgba(a.color, 0.48);
    ctx.lineWidth = gold ? 1.05 : 0.8;
    ctx.stroke();
    roundedRect(ctx, x + 2, y + 1.6, a.width - 4, Math.max(1, a.height * 0.26), 1.3);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fill();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, a: ConfettiAppearance) {
    const w = a.width;
    const h = a.height;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.44);
    ctx.bezierCurveTo(-w * 0.49, h * 0.16, -w * 0.65, -h * 0.2, -w * 0.33, -h * 0.43);
    ctx.bezierCurveTo(-w * 0.11, -h * 0.57, 0, -h * 0.24, 0, -h * 0.21);
    ctx.bezierCurveTo(w * 0.16, -h * 0.53, w * 0.51, -h * 0.46, w * 0.5, -h * 0.12);
    ctx.bezierCurveTo(w * 0.5, h * 0.12, w * 0.18, h * 0.36, 0, h * 0.44);
    this.softFill(ctx, a);
    ctx.fill();
    ctx.strokeStyle = rgba(a.color, 0.48);
    ctx.lineWidth = 0.75;
    ctx.stroke();
  }

  private drawStar(ctx: CanvasRenderingContext2D, a: ConfettiAppearance) {
    const r = a.width * 0.49;
    const inner = r * 0.57;
    const vertices = Array.from({ length: 10 }, (_, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const radius = i % 2 === 0 ? r : inner;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });
    const start = vertices[9];
    const first = vertices[0];
    ctx.beginPath();
    ctx.moveTo((start.x + first.x) / 2, (start.y + first.y) / 2);
    for (let i = 0; i < vertices.length; i++) {
      const point = vertices[i];
      const next = vertices[(i + 1) % vertices.length];
      ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
    ctx.closePath();
    this.softFill(ctx, a);
    ctx.fill();
    ctx.strokeStyle = rgba(a.color, 0.48);
    ctx.lineWidth = 0.85;
    ctx.stroke();
  }
}
