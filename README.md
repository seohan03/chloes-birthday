# Psst... you're invited.

The **first scene only** of an experimental birthday invitation: an off-white/white canvas; translucent, pastel, bead-like confetti with real Matter.js collisions; and one whispered greeting. Built with Next.js App Router, TypeScript, Tailwind CSS 4, Motion for React, and Matter.js. No CSS confetti, canvas-confetti, external images, remote fonts, or extra scenes.

## 1. Initialize or use the supplied project

### Recommended: use the complete supplied source

Extract `birthday-confetti-intro.zip`, open the project directory, then run:

```bash
cd birthday-confetti-intro
npm install
npm run dev
```

Open **http://localhost:3000**. The project already contains the full Next.js setup, so **do not run `create-next-app` inside it**.

### Starting from an empty folder instead

```bash
npx create-next-app@latest birthday-confetti-intro --typescript --tailwind --eslint --app --use-npm --no-src-dir --import-alias '@/*'
cd birthday-confetti-intro
npm install matter-js motion
npm install -D @types/matter-js
```

Then replace the generated app/configuration files with those supplied here, including `package.json` and `postcss.config.mjs`, and run `npm install` again to reconcile dependencies. The supplied project is simpler and less error-prone.

## 2. Dependencies

Runtime: `next`, `react`, `react-dom`, `matter-js`, `motion`.

Build/dev: `typescript`, `tailwindcss`, `@tailwindcss/postcss`, `@types/matter-js`, `@types/node`, `@types/react`, `@types/react-dom`.

Versions are defined in `package.json`. `npm install` will create `package-lock.json`; commit it to Git so Vercel installs reproducibly with `npm ci`.

## 3. File structure

```text
birthday-confetti-intro/
├── app/
│   ├── globals.css            # White backdrop and Tailwind import
│   ├── layout.tsx             # Metadata and document shell
│   └── page.tsx               # Renders the first scene only
├── components/
│   ├── BirthdayIntro.tsx       # Animated editorial copy (Motion)
│   └── ConfettiPhysics.tsx     # Client canvas lifecycle, reduced-motion listener
├── lib/confetti/
│   ├── config.ts              # Physical constants, palette, device caps
│   ├── types.ts               # Shape and particle types
│   ├── ConfettiRenderer.ts    # Cached watercolor bead sprites, Canvas 2D
│   └── ConfettiSimulation.ts  # Engine, boundaries, spawn timing, input, RAF
├── .gitignore
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── README.md
```

## 4. Choreography

- **0–1s:** the initial handful of beads enters from completely above the top edge, starting on the left.
- **1–3s:** the densest shower arrives; genuine bouncing, tumbles, collisions and crowding begin.
- **3–5s:** the spawn rate decreases, leaving more negative space.
- **5–7s:** the last pieces arrive and continue to settle; the pile stays in the Matter world.
- **After ~6.7s:** a shallow interaction surface at the bottom activates. Mouse hover nudges beads; mouse/touch pressing a bead creates a damped Matter spring. Releasing removes the spring and normal gravity takes over.
- **At 1.5s:** the small `psst... you're invited.` line fades upward in Motion.
- **Reduced motion:** a physical arrangement is settled synchronously, drawn once, and never RAF-animated. The text appears immediately.

All pieces are dynamic rigid bodies. The bottom and side walls are static but invisible. The sprite shapes are approximate convex collisions (circles, rounded rectangles, 5/6-gons), which is deliberate for stability and mobile performance. Donut holes are visual; the ring is physically a solid bead, not a concave mesh.

## 5. Physics tuning

| Parameter | Default | Role |
|---|---:|---|
| `gravity` | 1.14 | Downward acceleration in Matter's normalized gravity units |
| `gravityScale` | 0.001 | Matter's gravity scaling convention |
| `restitution` | 0.28 | A small, tactile bounce at impact |
| `friction` | 0.66 | Dynamic friction between beads and ground |
| `frictionStatic` | 0.82 | Helps a finished pile hold its shape |
| `frictionAir` | 0.012 | Damps translation and spin while free-falling/tumbling |
| `density` | 0.0012 | Appropriate mass for tiny solids; mass scales with area |
| `sleepThreshold` | 65 | Allows calmer beads to sleep and improves performance |
| `positionIterations` | 8 | Resolves penetration in stacks |
| `velocityIterations` | 8 | Resolves collision impulses and bounces |
| `constraintIterations` | 3 | Stable pointer-drag springs |
| `dragStiffness` | 0.18 | How insistently a bead follows the hand |
| `dragDamping` | 0.13 | Suppresses exaggerated dragging oscillation |
| `fixedStepMs` | 16.667 | Stable 60 Hz physics independent of screen FPS |
| `maxStepsPerFrame` | 4 | Avoids the spiral of death on slow hardware |
| `maxDpr` | 2 | Preserves sharp details without excessive pixel work |
| `particleLimit(width)` | 106–208 | Mobile/desktop workload limits |

The ticker adds elapsed time to an accumulator, advances the engine in fixed 1/60 s steps, caps catch-up work, then draws once per browser `requestAnimationFrame`. The renderer operates in CSS pixel coordinates; **DPR affects only canvas backing-store resolution**, not Matter physics or pointer coordinates. The window and `visualViewport` resize listeners, plus a `ResizeObserver`, resize both backing store and static walls; the bottom-near pile shifts along with the new scene floor.

The sprites are pre-rendered **once per particle** to tiny canvases and composited with rotation, avoiding hundreds of DOM elements and repeated gradient/path work per frame. Once every bead is asleep after the entrance, the RAF loop stops entirely; dragging and hover input wake it again. Bodies may settle or wake up from collision, hover disturbance, or dragging.

## 6. Adjusting the art direction

- **Colors:** `PALETTE` in `lib/confetti/config.ts` matches the provided pastel beads: rose, lilac, pale blue, periwinkle, mint, sea glass, butter yellow, pistachio, and apricot.
- **Shapes:** `createAppearance()` in `ConfettiSimulation.ts` controls the proportions of marbles, faceted beads, rings, flowers, tubes, gold-rim inlays, hearts and rounded stars.
- **Artwork:** `ConfettiRenderer.ts` paints the shapes as soft, slightly translucent illustrations. No background image is used; everything that falls has a physical body.
- **Rain timing/left bias:** `createSpawnSchedule()` and `spawnDue()` in `ConfettiSimulation.ts`.
- **Lettering:** `components/BirthdayIntro.tsx`.

## 7. Production checks and deployment

```bash
npm run typecheck
npm run build
npm run start
```

For GitHub:

```bash
git init
git add .
git commit -m "Build Matter.js confetti invitation intro"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

Create an empty GitHub repository first and substitute its real URL. Then go to **vercel.com → Add New → Project**, import that GitHub repository, keep **Framework Preset: Next.js**, and deploy. No environment variables are required. Future pushes to the tracked branch will trigger deployment.

If using Vercel CLI instead, install the CLI in your own environment, sign in, and run `vercel` followed by `vercel --prod` when ready.

## 8. Troubleshooting

**Canvas is blank.** Inspect browser console for Canvas2D errors; make sure JS is enabled, `ConfettiPhysics.tsx` is a Client Component, and the parent `<main>` has a measured `100dvh` height. At the first instant, beads are intentionally above the screen and descend shortly afterward. A user with reduced motion sees an immediate static pile.

**React hydration mismatch.** Matter.js is instantiated only inside `useEffect`—never in server render or module top-level access to `window`. Do not create the engine or call `document.createElement()` while rendering React on the server. Motion handles the independent text reveal.

**Two simulations are running in development.** React Strict Mode mounts effects twice intentionally in development; cleanup cancels RAF, clears the engine, disconnects observers, and removes listeners before the next instance starts. Keep the cleanup in `ConfettiPhysics.tsx`.

**Pieces pass through the floor.** Keep a fixed physics timestep and avoid huge gravity, extremely thin colliders, or much higher initial velocities. Increase `positionIterations`/`velocityIterations` slightly if changing particle sizes or density substantially. The floor is a thick static collider whose *top* is exactly at viewport bottom.

**Performance stutters on mobile.** Lower the values in `particleLimit()`, shorten the sprite dimensions, or set `maxDpr` to `1.5`. Avoid increasing solver iterations and body count together. The simulation stops trying to catch up after a slow frame to keep the UI responsive.

**Drag feels offset on a high-DPI screen.** Never multiply pointer client coordinates by `devicePixelRatio`. Matter works in CSS pixels; the canvas rendering transform handles the scaled backing store. Pointer math uses the canvas `getBoundingClientRect()`.

**Touch gestures block scrolling.** The canvas itself has `pointer-events: none`; only the bottom `min(29dvh, 240px)` interaction strip has `touch-action: none`, and it is activated after the initial rain. Narrow the strip in `ConfettiPhysics.tsx` if future content needs gestures near the footer. Put future interactive buttons above this strip or give them a higher stacking layer. Do not apply `touch-action: none` to the page.

**Pile looks too dense or too far left.** Increase the rightward starting velocity gently in `spawnDue()` or widen the left-biased spawn range. Do not use static CSS transforms for the resting pile; Matter must continue to own its position.

**Resize/orientation issues.** Keep the actual canvas width and height in sync with its CSS box, and move/scale the three physical boundaries on resize. Do not simply stretch a snapshot of the old canvas.

## 9. Adding later scenes

`BirthdayIntro` is a self-contained first scene. A future scene controller can mount/unmount it, or call `destroy()` on the simulation through a scene wrapper. The physics engine, renderer and configuration deliberately do not depend on scene-specific UI or the greeting text.
