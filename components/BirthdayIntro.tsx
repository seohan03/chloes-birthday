"use client";

import { motion, useReducedMotion } from "motion/react";
import ConfettiPhysics from "@/components/ConfettiPhysics";

export default function BirthdayIntro() {
  const reduceMotion = useReducedMotion();

  return (
    <main
      className="relative isolate w-full overflow-hidden bg-white"
      style={{ height: "100dvh" }}
      aria-label="Birthday invitation entrance"
    >
      <ConfettiPhysics />

      <div className="pointer-events-none absolute inset-x-0 top-[47%] z-20 px-4 text-center">
        <motion.p
          className="m-0 font-serif text-[clamp(15px,1.5vw,19px)] italic tracking-[-0.035em] text-[#171717]"
          initial={reduceMotion ? false : { opacity: 0, y: 9 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.75,
            delay: reduceMotion ? 0 : 1.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          psst... you&apos;re invited.
        </motion.p>
      </div>
    </main>
  );
}
