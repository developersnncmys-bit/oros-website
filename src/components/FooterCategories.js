"use client";

import { useState } from "react";
import Link from "next/link";

// The catalogue can carry a long tail of categories — the footer shows the
// first slice and lets the reader open the rest in place rather than run off
// the bottom of the page.
const INITIAL = 8;

export default function FooterCategories({ categories = [], productCount = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? categories : categories.slice(0, INITIAL);
  const hidden = categories.length - INITIAL;

  return (
    <ul className="space-y-2.5">
      <li>
        <Link
          href="/shop"
          className="text-sm font-semibold text-white/80 transition-colors hover:text-neon-2"
        >
          All {productCount} products
        </Link>
      </li>

      {shown.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/shop?category=${c.slug}`}
            className="group flex items-baseline gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            {c.name}
          </Link>
        </li>
      ))}

      {hidden > 0 && (
        <li>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm font-semibold text-neon-2 transition-colors hover:text-white"
          >
            {expanded ? "Show less" : `More (${hidden})`}
          </button>
        </li>
      )}
    </ul>
  );
}
