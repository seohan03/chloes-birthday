"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Scene 2 — the four reference mockups were designed at 393 × 751.
 * All artwork coordinates below are in that artboard's pixels and then
 * converted to percentages, so the collage scales without drifting.
 *
 * Add the following files to /public:
 *   cream.jpg
 *   characters.png (or character.png), characters-2.png
 *   chloe-turns-21.png
 *   chloe-now.png, chloe-baby.png, chloe-now-2.png, chloe-baby-2.png
 *   white-frame.png, wipe-away-frosting.png
 */

const PARTY = {
  tagline: ["a little", "birthday", "party."],
  date: "nov 27",
  time: "6:00PM",
  address: "9632 hillock ct",
  rsvpLabel: "RSVP",
  rsvpSuffix: "for more info",
};

const COVER_IMAGE = "/cream.jpg";
const WIPING_FRAME_IMAGE = "/white-frame.png";
const WIPING_LETTERING_IMAGE = "/wipe-away-frosting.png";
const MAX_DPR = 2;
const AUTO_REVEAL_AT = 0.56;
const SAMPLE_INTERVAL_MS = 190;
const BRUSH_TIP_SIZE = 144;
const BRUSH_VARIANTS = 4;

const ARTBOARD = { width: 393, height: 751 } as const;
const PHOTO_INTERVAL_MS = 1000;
const CHARACTER_INTERVAL_MS = 550;

/** Number of visible photo layers: add 1,2,3,4, then remove 4,3,2, repeat. */
const PHOTO_SEQUENCE = [1, 2, 3, 4, 3, 2] as const;

/** Pixel positions sampled from your four phone mockups. */
const PHOTOS = [
  { src: "/chloe-now.png", alt: "Chloe — photo one", x: 64, y: 286, w: 168, h: 226 },
  { src: "/chloe-baby.png", alt: "Chloe as a baby — photo two", x: 51, y: 302, w: 157, h: 235 },
  { src: "/chloe-now-2.png", alt: "Chloe — photo three", x: 84, y: 323, w: 155, h: 206 },
  { src: "/chloe-baby-2.png", alt: "Chloe as a baby — photo four", x: 64, y: 340, w: 159, h: 153 },
] as const;

/** Responsive positioning while preserving the exact 393 × 751 collage geometry. */
function at(x: number, y: number, w?: number, h?: number): CSSProperties {
  return {
    left: `${(x / ARTBOARD.width) * 100}%`,
    top: `${(y / ARTBOARD.height) * 100}%`,
    ...(w === undefined ? {} : { width: `${(w / ARTBOARD.width) * 100}%` }),
    ...(h === undefined ? {} : { height: `${(h / ARTBOARD.height) * 100}%` }),
  };
}

interface Point {
  x: number; // Relative to canvas width (0..1), for resize safety.
  y: number; // Relative to canvas height (0..1).
}

interface Mark {
  from: Point | null;
  to: Point;
  pressure: number;
  seed: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function brushRadius(width: number, height: number) {
  return clamp(Math.min(width, height) * 0.11, 44, 110);
}

/** Draw the portrait JPEG as CSS object-fit: cover, without stretching it. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scaledWidth = image.naturalWidth * scale;
  const scaledHeight = image.naturalHeight * scale;
  ctx.drawImage(
    image,
    (width - scaledWidth) / 2,
    (height - scaledHeight) / 2,
    scaledWidth,
    scaledHeight,
  );
}

/** A repeatable pseudo-random number: the same wipe repaints identically on resize. */
function noise(seed: number): number {
  const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

/**
 * Make a ragged, translucent frosting brush on a tiny offscreen canvas.
 * Its edge has overlapping ripples, grain and occasional tiny un-erased pores.
 * The photograph itself is NOT modified or replaced.
 */
function createFrostingTip(variant: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = BRUSH_TIP_SIZE;
  canvas.height = BRUSH_TIP_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const pixels = context.createImageData(BRUSH_TIP_SIZE, BRUSH_TIP_SIZE);
  const mid = (BRUSH_TIP_SIZE - 1) / 2;
  const phase = variant * 1.73;

  for (let y = 0; y < BRUSH_TIP_SIZE; y++) {
    for (let x = 0; x < BRUSH_TIP_SIZE; x++) {
      const nx = (x - mid) / mid;
      const ny = (y - mid) / mid;
      const distance = Math.hypot(nx, ny);
      const angle = Math.atan2(ny, nx);
      const boundary =
        0.82 +
        0.065 * Math.sin(5 * angle + phase) +
        0.045 * Math.sin(11 * angle - phase * 0.77) +
        0.033 * Math.cos(19 * angle + phase * 1.42);
      const feather = clamp((boundary - distance) / 0.19, 0, 1);
      const smooth = feather * feather * (3 - 2 * feather);
      const grain =
        0.88 +
        0.12 * Math.sin(nx * 37 + phase) * Math.cos(ny * 43 - phase);
      const pores =
        Math.sin(nx * 103 + Math.cos(ny * 59 + phase)) *
        Math.cos(ny * 89 + Math.sin(nx * 63 - phase));
      const poreFactor = pores > 0.76 ? 0.4 : 1;
      const index = (y * BRUSH_TIP_SIZE + x) * 4;
      pixels.data[index] = 255;
      pixels.data[index + 1] = 255;
      pixels.data[index + 2] = 255;
      pixels.data[index + 3] = Math.round(255 * smooth * grain * poreFactor);
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

/**
 * Smear instead of cutting perfect round holes. The elongated marks follow the
 * direction of the drag; translucent edges, offset bristles and small gaps make
 * the remaining cream feel uneven and soft.
 */
function eraseMark(
  ctx: CanvasRenderingContext2D,
  mark: Mark,
  width: number,
  height: number,
  tips: HTMLCanvasElement[],
) {
  if (!tips.length) return;
  const start = mark.from ?? mark.to;
  const x0 = start.x * width;
  const y0 = start.y * height;
  const x1 = mark.to.x * width;
  const y1 = mark.to.y * height;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.hypot(dx, dy);
  const angle = distance > 0.01 ? Math.atan2(dy, dx) : -0.3;
  const radius = brushRadius(width, height) * (0.86 + 0.27 * mark.pressure);
  const steps = mark.from ? Math.max(1, Math.ceil(distance / (radius * 0.23))) : 1;
  const firstStep = mark.from ? 1 : 0;

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";

  for (let step = firstStep; step <= steps; step++) {
    const progress = mark.from ? step / steps : 1;
    const variation = noise(mark.seed * 17.13 + step * 9.17);
    const sideways = (variation - 0.5) * radius * 0.12;
    const x = x0 + dx * progress - Math.sin(angle) * sideways;
    const y = y0 + dy * progress + Math.cos(angle) * sideways;
    const dabRadius = radius * (0.91 + 0.16 * noise(mark.seed * 13.9 + step));
    const tip = tips[(mark.seed + step) % tips.length];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + (variation - 0.5) * 0.19);
    ctx.scale(1.15, 0.87);
    ctx.globalAlpha = 0.74;
    ctx.drawImage(tip, -dabRadius, -dabRadius, dabRadius * 2, dabRadius * 2);

    // Separate soft bristle trails along the two sides, especially while moving.
    if (step % 2 === 0 && mark.from) {
      const fringe = tips[(mark.seed + step + 2) % tips.length];
      ctx.globalAlpha = 0.21;
      const side = step % 4 === 0 ? 1 : -1;
      const fringeSize = dabRadius * (0.43 + variation * 0.13);
      ctx.drawImage(
        fringe,
        -fringeSize * 1.65,
        side * dabRadius * 0.59 - fringeSize * 0.45,
        fringeSize * 2.4,
        fringeSize * 0.9,
      );
    }
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Both the frosting cover and the revealed invitation use the same animation
 * clock, so the two drawings alternate seamlessly through the transition.
 * Coordinates include the large transparent margins in the supplied artwork.
 */
function CharacterArt({
  frame,
  firstFile,
  onFirstMissing,
  position,
  decorative = false,
}: {
  frame: number;
  firstFile: string;
  onFirstMissing: () => void;
  position: CSSProperties;
  decorative?: boolean;
}) {
  const src = frame === 0 ? firstFile : "/characters-2.png";
  return (
    <img
      src={src}
      alt={decorative ? "" : "Two hand-drawn birthday characters"}
      aria-hidden={decorative || undefined}
      draggable={false}
      onError={() => {
        // The first drawing has appeared as both character.png and characters.png.
        if (src === "/characters.png") onFirstMissing();
      }}
      className="pointer-events-none absolute select-none"
      style={{ ...position, height: "auto" }}
    />
  );
}

/**
 * Art direction from the supplied 393 × 751 frosting mockup.
 * This artwork sits ABOVE the scratch canvas but cannot capture pointer events.
 * When someone starts wiping it fades gently to reveal the collage beneath.
 * The character animation continues underneath on the very same timer.
 */
function FrostingPrompt({
  started,
  reduceMotion,
  characterFrame,
  firstCharacterFile,
  onFirstCharacterMissing,
}: {
  started: boolean;
  reduceMotion: boolean;
  characterFrame: number;
  firstCharacterFile: string;
  onFirstCharacterMissing: () => void;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
      initial={false}
      animate={{ opacity: started ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.55, ease: "easeOut" }}
    >
      <div
        className="relative shrink-0"
        style={{ width: "min(100vw, 52.33dvh, 520px)", aspectRatio: "393 / 751" }}
      >
        {/* Torn white paper is a transparent PNG, not a CSS approximation. */}
        <img
          src={WIPING_FRAME_IMAGE}
          alt=""
          draggable={false}
          className="absolute select-none"
          style={at(96, 320, 227, 160)}
        />
        <CharacterArt
          frame={characterFrame}
          firstFile={firstCharacterFile}
          onFirstMissing={onFirstCharacterMissing}
          position={at(30, 143, 435)}
          decorative
        />
        <span
          className="absolute block whitespace-nowrap text-[#3d3b3a]"
          style={{ ...at(120, 345), fontFamily: "'GroteskFont', Arial, sans-serif", fontSize: "clamp(9px, 2.8vw, 12px)", lineHeight: 1.1 }}
        >
          something’s underneath ...
        </span>
        {/* Your exact hand-lettered PNG; no browser font substitution. */}
        <img
          src={WIPING_LETTERING_IMAGE}
          alt=""
          draggable={false}
          className="absolute select-none"
          style={{ ...at(119, 357, 184), height: "auto" }}
        />
      </div>
    </motion.div>
  );
}

/** The photos deliberately overlap: every new image is on top of the prior one. */
function InvitationCollage({
  revealed,
  reducedMotion,
  characterFrame,
  firstCharacterFile,
  onFirstCharacterMissing,
}: {
  revealed: boolean;
  reducedMotion: boolean;
  characterFrame: number;
  firstCharacterFile: string;
  onFirstCharacterMissing: () => void;
}) {
  const [photoStep, setPhotoStep] = useState(0);

  useEffect(() => {
    if (!revealed || reducedMotion) return;
    const photoTimer = window.setInterval(() => {
      setPhotoStep((step) => (step + 1) % PHOTO_SEQUENCE.length);
    }, PHOTO_INTERVAL_MS);
    return () => window.clearInterval(photoTimer);
  }, [revealed, reducedMotion]);

  // Reset photo stacking if the frosting is restored.
  useEffect(() => {
    if (!revealed) setPhotoStep(0);
  }, [revealed]);

  const visibleCount = PHOTO_SEQUENCE[photoStep];

  return (
    <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-white">
      {/* Exactly preserves 393:751. At 393×751, every coordinate maps 1:1. */}
      <article
        aria-label="Chloe's 21st birthday invitation"
        className="relative shrink-0 overflow-hidden bg-white text-black"
        style={{
          width: "min(100vw, 52.33dvh, 520px)",
          aspectRatio: "393 / 751",
        }}
      >
        {/* The supplied PNG has wide transparent margins; do not crop it. */}
        <CharacterArt
          frame={characterFrame}
          firstFile={firstCharacterFile}
          onFirstMissing={onFirstCharacterMissing}
          position={at(30, 25, 435)}
        />

        <img
          src="/chloe-turns-21.png"
          alt="Chloe turns 21!"
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{ ...at(26, 220, 253), height: "auto" }}
        />

        {/* The existing image PNGs are NOT edited. Layout matches mockup 1–4. */}
        <div className="absolute" style={at(247, 301, 114)}>
          <p
            className="m-0 text-[clamp(10px,2.9vw,14px)] leading-[1.15] tracking-[-0.025em]"
            style={{ fontFamily: "'GroteskFont', Arial, sans-serif" }}
          >
            {PARTY.tagline.map((line) => (
              <span className="block" key={line}>{line}</span>
            ))}
          </p>
        </div>

        <div className="absolute" style={at(247, 469, 144)}>
          <p
            className="m-0 text-[clamp(10px,2.9vw,14px)] leading-[1.16] tracking-[-0.03em]"
            style={{ fontFamily: "'GroteskFont', Arial, sans-serif" }}
          >
            <span className="block">{PARTY.date}</span>
            <span className="block">{PARTY.time}</span>
            <span className="block whitespace-nowrap">{PARTY.address}</span>
          </p>
        </div>

        {/* Photos are keyed independently: stacking and unstacking are natural. */}
        <div className="pointer-events-none absolute inset-0">
          <AnimatePresence initial={false}>
            {PHOTOS.slice(0, visibleCount).map((photo, index) => (
              <motion.img
                key={photo.src}
                src={photo.src}
                alt={photo.alt}
                draggable={false}
                className="absolute block select-none object-cover"
                style={{ ...at(photo.x, photo.y, photo.w, photo.h), zIndex: index + 1 }}
                initial={reducedMotion ? false : { opacity: 0, scale: 1.035, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, scale: 0.97, y: -8 }}
                transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
              />
            ))}
          </AnimatePresence>
        </div>

        <Link
          href="/scene-3"
          className="absolute z-10 inline-flex items-baseline gap-[0.3em] whitespace-nowrap text-[clamp(10px,3vw,14px)] leading-none text-black underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
          style={{
            ...at(64, 562),
            fontFamily: "'GroteskFont', Arial, sans-serif",
          }}
          aria-label="RSVP for more information — go to scene three"
          tabIndex={revealed ? 0 : -1}
        >
          <strong className="font-bold">{PARTY.rsvpLabel}</strong>
          <span>{PARTY.rsvpSuffix}</span>
        </Link>
      </article>
    </div>
  );
}

/** Wipe-to-reveal cream image; the collage below stays real, accessible HTML. */
export default function CreamReveal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const marksRef = useRef<Mark[]>([]);
  const brushTipsRef = useRef<HTMLCanvasElement[]>([]);
  const markSeedRef = useRef(0);
  const activePointerRef = useRef<number | null>(null);
  const previousPointRef = useRef<Point | null>(null);
  const lastSampleRef = useRef(0);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const repaintRef = useRef<() => void>(() => undefined);

  const [imageReady, setImageReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [characterFrame, setCharacterFrame] = useState(0);
  const [firstCharacterFile, setFirstCharacterFile] = useState("/characters.png");
  const reduceMotion = useReducedMotion() ?? false;

  // One animation clock for BOTH the frosting prompt and the invitation.
  // It starts as soon as Scene 2 opens, not only after the frosting is wiped.
  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setCharacterFrame((frame) => (frame + 1) % 2);
    }, CHARACTER_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  useEffect(() => {
    let disposed = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function repaint() {
      if (!canvas || !imageRef.current) return;
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, width, height);
      drawCover(ctx, imageRef.current, width, height);

      for (const mark of marksRef.current) {
        eraseMark(ctx, mark, width, height, brushTipsRef.current);
      }
    }

    brushTipsRef.current = Array.from(
      { length: BRUSH_VARIANTS },
      (_, index) => createFrostingTip(index),
    );
    repaintRef.current = repaint;
    const image = new window.Image();
    image.onload = () => {
      if (disposed) return;
      imageRef.current = image;
      repaint();
      setImageReady(true);
    };
    image.onerror = () => {
      if (disposed) return;
      console.error("Could not load /cream.jpg. Put cream.jpg in public/cream.jpg.");
    };
    image.src = COVER_IMAGE;

    const observer = new ResizeObserver(repaint);
    observer.observe(canvas);
    window.addEventListener("resize", repaint);

    return () => {
      disposed = true;
      image.onload = null;
      image.onerror = null;
      observer.disconnect();
      window.removeEventListener("resize", repaint);
      activePointerRef.current = null;
      imageRef.current = null;
      brushTipsRef.current = [];
      repaintRef.current = () => undefined;
    };
  }, []);

  function scratchPoint(clientX: number, clientY: number, pressure: number) {
    if (revealed || !imageReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const next: Point = {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
    const mark: Mark = {
      from: previousPointRef.current,
      to: next,
      pressure: clamp(pressure || 0.55, 0.2, 1),
      seed: markSeedRef.current++,
    };
    marksRef.current.push(mark);
    previousPointRef.current = next;

    eraseMark(ctx, mark, rect.width, rect.height, brushTipsRef.current);
  }

  function scratch(event: ReactPointerEvent<HTMLCanvasElement>) {
    const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];
    if (samples.length) {
      for (const sample of samples) {
        scratchPoint(sample.clientX, sample.clientY, sample.pressure);
      }
    } else {
      scratchPoint(event.clientX, event.clientY, event.pressure);
    }
    sampleCoverage(false);
  }

  function sampleCoverage(force: boolean) {
    const now = performance.now();
    if (!force && now - lastSampleRef.current < SAMPLE_INTERVAL_MS) return;
    lastSampleRef.current = now;
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const sampleCanvas = sampleCanvasRef.current ?? document.createElement("canvas");
    sampleCanvasRef.current = sampleCanvas;
    sampleCanvas.width = 64;
    sampleCanvas.height = clamp(
      Math.round((64 * canvas.clientHeight) / Math.max(1, canvas.clientWidth)),
      36,
      140,
    );
    const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);
    ctx.drawImage(canvas, 0, 0, sampleCanvas.width, sampleCanvas.height);
    const pixels = ctx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
    let removedOpacity = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      removedOpacity += 1 - pixels[i] / 255;
    }
    const fraction = removedOpacity / (pixels.length / 4);
    setCoverage(Math.round(fraction * 100));
    if (fraction >= AUTO_REVEAL_AT) {
      setRevealed(true);
      activePointerRef.current = null;
      previousPointRef.current = null;
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (revealed || !imageReady || activePointerRef.current !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    activePointerRef.current = event.pointerId;
    previousPointRef.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    setStarted(true);
    scratch(event);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (activePointerRef.current !== event.pointerId || revealed) return;
    event.preventDefault();
    scratch(event);
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (activePointerRef.current !== event.pointerId) return;
    activePointerRef.current = null;
    previousPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    sampleCoverage(true);
  }

  function restart() {
    activePointerRef.current = null;
    previousPointRef.current = null;
    marksRef.current = [];
    markSeedRef.current = 0;
    lastSampleRef.current = 0;
    setCoverage(0);
    setStarted(false);
    setRevealed(false);
    repaintRef.current();
  }

  return (
    <main
      className="relative isolate h-[100dvh] w-full overflow-hidden bg-white text-black"
      aria-label="Birthday invitation details — wipe the frosting to reveal"
    >
      <InvitationCollage
        revealed={revealed}
        reducedMotion={reduceMotion}
        characterFrame={characterFrame}
        firstCharacterFile={firstCharacterFile}
        onFirstCharacterMissing={() => setFirstCharacterFile("/character.png")}
      />

      {/* The frosting photo is a single textured Canvas 2D layer. */}
      <motion.canvas
        ref={canvasRef}
        aria-label="Wipe away the frosting with a finger or mouse to reveal the invitation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        initial={false}
        animate={{ opacity: revealed ? 0 : 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.75, ease: "easeOut" }}
        className="absolute inset-0 z-10 h-full w-full select-none"
        style={{
          cursor: imageReady && !revealed ? "crosshair" : "default",
          touchAction: "none",
          pointerEvents: revealed ? "none" : "auto",
          backgroundImage: imageReady ? "none" : `url('${COVER_IMAGE}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          WebkitTapHighlightColor: "transparent",
        }}
      />

      {!revealed && (
        <FrostingPrompt
          started={started}
          reduceMotion={reduceMotion}
          characterFrame={characterFrame}
          firstCharacterFile={firstCharacterFile}
          onFirstCharacterMissing={() => setFirstCharacterFile("/character.png")}
        />
      )}

      {!revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="absolute bottom-4 right-4 z-30 cursor-pointer rounded-sm bg-white/80 px-2 py-1 text-[11px] tracking-[-0.01em] text-[#3d3b3a]/75 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ fontFamily: "'GroteskFont', Arial, sans-serif" }}
        >
          show details
        </button>
      )}

      {revealed && (
        <button
          type="button"
          onClick={restart}
          className="absolute bottom-2 right-3 z-20 cursor-pointer px-2 py-1 text-[10px] tracking-[0.05em] text-black/40 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label="Cover the invitation with frosting again"
        >
          frost again ↺
        </button>
      )}
    </main>
  );
}
