"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import ProductImage from "@/components/ProductImage";
import { useCart } from "@/store/cartStore";

/**
 * The "product flies into the cart" animation.
 *
 * A ghost of the product is spawned at the exact rect of whatever was
 * clicked, arcs up and over to the header cart icon, then hands off to the
 * drawer. Portalled to <body> so no transformed ancestor can trap the
 * fixed positioning.
 */
export default function CartFly() {
  const { flight, endFlight } = useCart();
  const [mounted, setMounted] = useState(false);
  const ref = useRef(null);

  useEffect(() => setMounted(true), []);

  useGSAP(
    () => {
      if (!flight || !ref.current) return;

      const target = document.querySelector("[data-cart-icon]");
      // No icon on screen (or motion is off) — skip straight to the drawer.
      if (!target || prefersReducedMotion()) {
        endFlight();
        return;
      }

      const from = flight.rect;
      const to = target.getBoundingClientRect();
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);

      const tl = gsap.timeline({ onComplete: endFlight });

      tl.fromTo(
        ref.current,
        { x: 0, y: 0, scale: 1, autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.12 }
      )
        .to(
          ref.current,
          {
            // Two control points give it a lob rather than a straight slide.
            motionPath: {
              path: [
                { x: dx * 0.4, y: dy * 0.3 - 110 },
                { x: dx, y: dy },
              ],
              curviness: 1.5,
            },
            scale: 0.22,
            rotate: 24,
            duration: 0.72,
            ease: "power2.in",
          },
          0
        )
        .to(ref.current, { autoAlpha: 0, duration: 0.14 }, "-=0.14")
        // Land: thump the cart icon so the eye follows the handoff.
        .fromTo(
          target,
          { scale: 1 },
          { scale: 1.35, duration: 0.16, ease: "back.out(3)" },
          "-=0.16"
        )
        .to(target, { scale: 1, duration: 0.22, ease: "power2.out" });
    },
    { dependencies: [flight] }
  );

  if (!mounted || !flight) return null;

  return createPortal(
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed z-[90] grid place-items-center rounded-lg bg-white shadow-[0_10px_30px_-8px_rgba(43,27,77,0.45)]"
      style={{
        left: flight.rect.left,
        top: flight.rect.top,
        width: flight.rect.width,
        height: flight.rect.height,
        opacity: 0,
      }}
    >
      <ProductImage
        src={flight.image}
        alt=""
        sizes="200px"
        overlay
        className="rounded-lg"
      />
    </div>,
    document.body
  );
}
