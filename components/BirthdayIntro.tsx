"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import ConfettiPhysics from "@/components/ConfettiPhysics";

/**
 * Scene 01: independently animated letter over the existing Matter.js confetti.
 * A genuine <button> keeps touch, mouse, Enter and Space interactions accessible.
 * The second scene is a placeholder route until its artwork is ready.
 */
export default function BirthdayIntro() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [isOpening, setIsOpening] = useState(false);

  function openLetter() {
    if (isOpening) return;
    if (reduceMotion) {
      router.push("/scene-2");
    } else {
      setIsOpening(true);
    }
  }

  return (
    <main
      className="relative isolate w-full overflow-hidden bg-white"
      style={{ height: "100dvh" }}
      aria-label="Birthday invitation entrance"
    >
      <ConfettiPhysics />

      {/* The physics canvas remains separately interactive below the letter. */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-3">
        <motion.button
          type="button"
          aria-label="Open the letter and continue to the next scene"
          disabled={isOpening}
          onClick={openLetter}
          onAnimationComplete={() => {
            if (isOpening) router.push("/scene-2");
          }}
          className="pointer-events-auto relative block aspect-square w-[min(50vw,400px,40dvh)] cursor-pointer select-none border-0 bg-transparent p-0 outline-offset-4 focus-visible:outline-2 focus-visible:outline-black disabled:cursor-default"
          style={{ WebkitTapHighlightColor: "transparent" }}
          initial={reduceMotion ? false : { opacity: 0, y: 16, rotate: -2 }}
          animate={
            isOpening
              ? { opacity: 0, y: -55, rotate: -5, scale: 1.065 }
              : { opacity: 1, y: 0, rotate: 0, scale: 1 }
          }
          whileHover={
            isOpening || reduceMotion ? undefined : { scale: 1.025, rotate: 1 }
          }
          whileTap={isOpening || reduceMotion ? undefined : { scale: 0.985 }}
          transition={{
            delay: isOpening || reduceMotion ? 0 : 1.3,
            duration: reduceMotion ? 0 : isOpening ? 0.44 : 0.72,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Image
            src="/envelope.png"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="(max-width: 600px) 88vw, 520px"
            className="pointer-events-none object-contain"
            draggable={false}
          />

          {/* Aligned to the diagonal white sheet, not the pink envelope flap. */}
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute left-[50%] top-[45%] block -translate-x-1/2 -translate-y-1/2 rotate-[33deg] whitespace-nowrap text-[clamp(12px,5vw,40px)] leading-none tracking-[-0.03em] text-[#878085]"
            style={{ fontFamily: "'WhirlyFont', sans-serif" }}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduceMotion ? 0 : 1.75,
              duration: reduceMotion ? 0 : 0.6,
            }}
          >
            youre invited
          </motion.span>

          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 left-[10%] bottom-[0.5%] text-center text-[10px] uppercase tracking-[0.16em] text-[#3d343b]/70"
            style={{ fontFamily: "'ChampagneFont', sans-serif" }}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduceMotion ? 0 : 2.4, duration: 0.6 }}
          >
            tap to open
          </motion.span>
        </motion.button>
      </div>
    </main>
  );
}
