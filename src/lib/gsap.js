"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

// Register once, on the client only. Importing this module from any
// client component guarantees the plugins are live before it animates.
if (typeof window !== "undefined" && !gsap.core.globals().ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, useGSAP);
}

// Honour the OS "reduce motion" setting everywhere by making the
// reveal helpers no-ops rather than dotting checks through each component.
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, MotionPathPlugin, useGSAP };
