"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import ProductCard from "@/components/ProductCard";

/**
 * Horizontal product row. Arrows page by roughly one viewport of the track,
 * and hide themselves at each end so they never look broken.
 */
export default function Rail({
  title,
  subtitle,
  products,
  href = "/shop",
  showOptions = false,
}) {
  const track = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = () => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    sync();
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const page = (dir) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="bg-shell">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4 py-5">
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink lg:text-2xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-ink-3 lg:text-sm">{subtitle}</p>
            )}
          </div>
          <Link
            href={href}
            className="shrink-0 rounded-md bg-flame px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk lg:text-sm"
          >
            View all
          </Link>
        </div>

        <div className="relative pb-6">
          <div
            ref={track}
            className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth"
          >
            {products.map((p) => (
              <ProductCard
                key={p.slug}
                product={p}
                showOptions={showOptions}
                className="w-[calc(50%-6px)] shrink-0 snap-start sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-10px)]"
              />
            ))}
          </div>

          {!atStart && (
            <button
              onClick={() => page(-1)}
              aria-label="Scroll left"
              className="absolute -left-1 top-[38%] hidden h-20 w-9 -translate-y-1/2 place-items-center rounded-md bg-shell shadow-[0_4px_16px_rgba(43,27,77,0.22)] transition-colors hover:bg-canvas lg:grid"
            >
              <CaretLeft size={20} className="text-ink" weight="bold" />
            </button>
          )}
          {!atEnd && (
            <button
              onClick={() => page(1)}
              aria-label="Scroll right"
              className="absolute -right-1 top-[38%] hidden h-20 w-9 -translate-y-1/2 place-items-center rounded-md bg-shell shadow-[0_4px_16px_rgba(43,27,77,0.22)] transition-colors hover:bg-canvas lg:grid"
            >
              <CaretRight size={20} className="text-ink" weight="bold" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
