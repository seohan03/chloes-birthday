# Psst... you're invited!

The first scene of an interactive birthday invitation website. It has a simple white background, pastel confetti that falls and piles up using Matter.js physics, and a little welcome message.

Built with Next.js, TypeScript, Tailwind CSS, Motion, and Matter.js.

## Getting started

If you're using the provided ZIP file, unzip it, open the project folder, and run:

```bash
cd birthday-confetti-intro
npm install
npm run dev
```

Open http://localhost:3000 to see the website.

The ZIP already includes the Next.js setup, so you don't need to create a new project.

### Starting from scratch

If you aren't using the ZIP, create a Next.js project:

```bash
npx create-next-app@latest birthday-confetti-intro --typescript --tailwind --eslint --app --use-npm --no-src-dir --import-alias '@/*'
cd birthday-confetti-intro
npm install matter-js motion
npm install -D @types/matter-js
```

Then copy over the provided files, including the configuration files and `package.json`, and run `npm install` again.

## Project files

```text
birthday-confetti-intro/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── BirthdayIntro.tsx
│   └── ConfettiPhysics.tsx
├── lib/confetti/
│   ├── config.ts
│   ├── types.ts
│   ├── ConfettiRenderer.ts
│   └── ConfettiSimulation.ts
├── package.json
└── README.md
```

The main files to know are:

- `BirthdayIntro.tsx` — the welcome message and its animation.
- `ConfettiPhysics.tsx` — sets up the confetti canvas.
- `ConfettiSimulation.ts` — controls how the confetti falls, bounces, and moves.
- `ConfettiRenderer.ts` — controls how the confetti looks.
- `config.ts` — stores the colors and physics settings.

## How the scene works

When someone opens the website, pastel confetti starts falling from the top of the screen.

The pieces bounce, collide, and slowly pile up at the bottom instead of disappearing.

After about 1.5 seconds, the message "psst... you're invited." fades into view.

The confetti stops falling after around 7 seconds, but the pile stays on screen.

Once the confetti settles, visitors can move their cursor near the pile or drag the pieces around. This also works with touch on mobile.

The animation is reduced for visitors who have reduced-motion settings enabled.

## Making changes

Most of the settings can be found in `lib/confetti/config.ts`.

### Confetti appearance

To change the colors, edit `PALETTE` in `config.ts`.

To change the shapes, look for `createAppearance()` in `ConfettiSimulation.ts`.

The confetti is drawn in `ConfettiRenderer.ts`, so you can also change how the individual pieces look there.

### Confetti movement

You can adjust how the pieces move by changing the physics settings.

| Setting | What it changes |
|---|---|
| `gravity` | How quickly the confetti falls |
| `restitution` | How much the pieces bounce |
| `friction` | How easily they slide |
| `frictionAir` | How quickly movement slows down |
| `dragStiffness` | How closely pieces follow your cursor |

You can also change how many pieces appear using `particleLimit()` in `config.ts`.

The timing and spawning behavior are handled in `ConfettiSimulation.ts`.

### Welcome message

To change "psst... you're invited." or its animation, edit `components/BirthdayIntro.tsx`.

## Testing the website

To check that everything works, run:

```bash
npm run typecheck
npm run build
npm run start
```

Make sure the confetti falls, settles at the bottom, and responds to dragging.

It's also worth testing on your phone to make sure the animation runs smoothly.

## Uploading to GitHub

Create a new GitHub repository, then run:

```bash
git init
git add .
git commit -m "Add birthday confetti intro"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

Replace the repository URL with your own.

## Hosting on Vercel

1. Go to https://vercel.com.
2. Create a new project.
3. Import your GitHub repository.
4. Keep Next.js as the framework.
5. Click Deploy.

Once it's deployed, Vercel will give you a link to your website.

Any new changes pushed to your connected production branch will automatically update the live site.

## If something isn't working

**Confetti isn't showing**

Check the browser console for errors and make sure `ConfettiPhysics.tsx` is set up as a client component.

**Confetti falls through the bottom**

Check the gravity and collision settings in `ConfettiSimulation.ts`.

**Animation is laggy**

Try lowering the number of confetti pieces in `particleLimit()`, especially for mobile.

**Dragging feels off**

Check the pointer coordinates in `ConfettiSimulation.ts`. They should use the canvas position without multiplying by the device pixel ratio.

**Touch isn't working properly**

Check the interaction area in `ConfettiPhysics.tsx`. Only the bottom part of the screen should capture dragging gestures.

**Hydration errors**

Make sure the physics simulation only starts in the browser and not during server rendering.

**Problems after resizing**

Make sure the canvas and physics boundaries update when the screen size changes.

## Adding more scenes

This project currently only includes the first scene.

The confetti animation is kept separate from the welcome message so it's easier to add new scenes later without changing everything.

The next scenes can build on this setup while keeping their own animations and interactions.