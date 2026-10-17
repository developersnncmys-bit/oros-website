"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/**
 * Lenis smooth scroll, driven by GSAP's ticker so that Lenis and
 * ScrollTrigger share a single rAF loop. Running them on separate loops is
 * the usual cause of jittery / mis-measured pinned sections.
 */
export default function SmoothScroll({ children }) {
  useEffect(() => {
    // Reveals are gated on this class so content stays visible if JS never runs.
    document.documentElement.classList.add("js-ready");

    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    lenis.on("scroll", ScrollTrigger.update);
    // exposed so code that swaps a view in place can jump to the top
    // through Lenis (see lib/scrollTop.js)
    window.__lenis = lenis;

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      if (window.__lenis === lenis) delete window.__lenis;
    };
  }, []);

  return children;
}
