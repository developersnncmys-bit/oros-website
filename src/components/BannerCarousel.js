"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import TwoToneHeading from "@/components/TwoToneHeading";

/**
 * Slides come from the admin-managed /Banner API (type=SLIDER) — photo,
 * kicker, title, subtitle, CTA and tone all live there. `tone` (LIGHT/DARK,
 * admin-picked per banner) drives which of these two palettes the chrome
 * — kicker chip, scrim, CTA pill, arrows, dots — renders in; the title
 * parts and subtitle carry their own admin-picked colours regardless of tone.
 */
const TONE = {
  light: {
    bg: "bg-cream",
    scrim: "from-cream/92 via-cream/55 to-cream/10",
    scrimMobile: "bg-cream/75",
    sub: "text-ink-2",
    kicker: "bg-ink/10 text-ink",
    cta: "bg-ink text-white hover:bg-flame",
    arrow: "bg-ink/80 text-white hover:bg-ink",
    dotOn: "bg-ink",
    dotOff: "bg-ink/25",
  },
  dark: {
    bg: "bg-navy",
    scrim: "from-navy/90 via-navy/50 to-navy/10",
    scrimMobile: "bg-navy/40",
    sub: "text-white/80",
    kicker: "bg-white/20 text-white",
    cta: "bg-white text-ink hover:bg-cream",
    arrow: "bg-white/85 text-ink hover:bg-white",
    dotOn: "bg-white",
    dotOff: "bg-white/50",
  },
};

export default function BannerCarousel({ banners = [] }) {
  const [idx, setIdx] = useState(0);
  const scope = useRef(null);
  const timer = useRef(null);

  const go = useCallback(
    (next) => {
      setIdx((cur) => (next + banners.length) % banners.length);
    },
    [banners.length]
  );

  // Auto-advance, restarted whenever the slide changes so a manual click
  // gives you a full interval rather than a stub of one.
  useEffect(() => {
    if (banners.length < 2 || prefersReducedMotion()) return;
    timer.current = setTimeout(() => go(idx + 1), 6000);
    return () => clearTimeout(timer.current);
  }, [idx, go, banners.length]);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !scope.current) return;
      const active = scope.current.querySelector("[data-slide-active]");
      if (!active) return;

      gsap.fromTo(
        active.querySelectorAll("[data-slide-anim]"),
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.08, ease: "expo.out" }
      );

      // Slow push-in on the photo so the banner never feels static.
      const photo = active.querySelector("[data-slide-photo]");
      if (photo) {
        gsap.fromTo(photo, { scale: 1.08 }, { scale: 1, duration: 6.5, ease: "none" });
      }
    },
    { dependencies: [idx], scope }
  );

  if (banners.length === 0) return null;

  const slide = banners[idx];
  const t = TONE[slide.tone] || TONE.light;

  return (
    <section ref={scope} className="bg-shell">
      <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-8">
        <div
          data-slide-active
          key={slide.id}
          className={`relative min-h-[400px] overflow-hidden rounded-2xl lg:min-h-[470px] ${t.bg}`}
        >
          <div data-slide-photo className="absolute inset-0">
            <Image
              src={slide.imageMobile}
              alt=""
              fill
              preload={idx === 0}
              sizes="calc(100vw - 2rem)"
              className="block object-cover object-right lg:hidden"
            />
            <Image
              src={slide.imageDesktop}
              alt=""
              fill
              preload={idx === 0}
              sizes="(max-width: 1600px) calc(100vw - 4rem), 1536px"
              className="hidden object-cover object-right lg:block"
            />
          </div>

          {/* Scrim so title/subtitle stay legible over any admin photo. */}
          <div className={`absolute inset-0 bg-gradient-to-r ${t.scrim}`} />
          <div className={`absolute inset-0 lg:hidden ${t.scrimMobile}`} />

          <div className="relative grid h-full items-center gap-6 px-12 py-12 sm:px-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
            <div className="max-w-xl">
              {slide.kicker && (
                <span
                  data-slide-anim
                  className={`mb-5 inline-block rounded-full px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] ${t.kicker}`}
                >
                  {slide.kicker}
                </span>
              )}

              <TwoToneHeading
                title1={slide.title1}
                title2={slide.title2}
                title1Color={slide.title1Color}
                title2Color={slide.title2Color}
                data-slide-anim
                className="max-w-xl font-display text-[clamp(2rem,4.8vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]"
              />

              {slide.subTitle && (
                <p
                  data-slide-anim
                  style={slide.subTitleColor ? { color: slide.subTitleColor } : undefined}
                  className={`mt-4 max-w-lg text-sm leading-relaxed sm:text-base ${t.sub}`}
                >
                  {slide.subTitle}
                </p>
              )}

              {slide.ctaLabel && slide.ctaUrl && (
                <Link
                  data-slide-anim
                  href={slide.ctaUrl}
                  style={{
                    "--cta-bg": slide.title1Color || undefined,
                    "--cta-bg-hover": slide.title2Color || undefined,
                  }}
                  className={`mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-extrabold transition-all duration-300 hover:-translate-y-0.5 ${
                    slide.title1Color
                      ? "bg-[var(--cta-bg)] text-white hover:bg-[var(--cta-bg-hover)]"
                      : t.cta
                  }`}
                >
                  {slide.ctaLabel}
                  <CaretRight size={15} weight="bold" />
                </Link>
              )}
            </div>
          </div>

          {/* ── Controls ── */}
          {banners.length > 1 && (
            <>
              <button
                onClick={() => go(idx - 1)}
                aria-label="Previous banner"
                className={`absolute left-0 top-1/2 grid h-12 w-8 -translate-y-1/2 sm:h-16 sm:w-9 place-items-center rounded-r-md transition-colors ${t.arrow}`}
              >
                <CaretLeft size={20} weight="bold" />
              </button>
              <button
                onClick={() => go(idx + 1)}
                aria-label="Next banner"
                className={`absolute right-0 top-1/2 grid h-12 w-8 -translate-y-1/2 sm:h-16 sm:w-9 place-items-center rounded-l-md transition-colors ${t.arrow}`}
              >
                <CaretRight size={20} weight="bold" />
              </button>

              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    onClick={() => go(i)}
                    aria-label={`Go to banner ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === idx ? `w-7 ${t.dotOn}` : `w-1.5 ${t.dotOff}`
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
