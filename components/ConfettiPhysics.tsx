"use client";

import { useEffect, useRef } from "react";
import { ConfettiSimulation } from "@/lib/confetti/ConfettiSimulation";

/** React owns only the canvas nodes; Matter.js owns all moving objects. */
export default function ConfettiPhysics() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const interactionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const interactionArea = interactionRef.current;
    if (!canvas || !interactionArea) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let simulation = new ConfettiSimulation(canvas, interactionArea, preference.matches);
    simulation.start();

    // Restart safely if the OS preference changes while the page is open.
    const onPreferenceChange = () => {
      simulation.destroy();
      simulation = new ConfettiSimulation(canvas, interactionArea, preference.matches);
      simulation.start();
    };

    preference.addEventListener("change", onPreferenceChange);

    return () => {
      preference.removeEventListener("change", onPreferenceChange);
      simulation.destroy();
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 block h-full w-full"
        aria-hidden="true"
      />
      {/* Only the lower portion can consume touch gestures; future UI stays usable. */}
      <div
        ref={interactionRef}
        className="absolute inset-x-0 bottom-0 z-10 touch-none"
        style={{ height: "min(29dvh, 240px)", pointerEvents: "none" }}
        aria-hidden="true"
      />
    </>
  );
}
