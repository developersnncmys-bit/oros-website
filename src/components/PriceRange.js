"use client";

import { formatINR } from "@/lib/format";

/**
 * Dual-thumb price slider. `value` is [lo, hi]; `onChange` gets the next
 * [lo, hi]. The two range inputs are stacked — CSS (.range-dual) lets only
 * the thumbs take pointer events so both handles stay grabbable.
 */
export default function PriceRange({
  min = 0,
  max = 10000,
  step = 50,
  value,
  onChange,
}) {
  const [lo, hi] = value;
  const span = Math.max(1, max - min);
  const pctLo = ((lo - min) / span) * 100;
  const pctHi = ((hi - min) / span) * 100;

  return (
    <div className="w-64 px-2 py-2">
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-flame"
          style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }}
        />
        <input
          type="range"
          aria-label="Minimum price"
          className="range-dual"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) =>
            onChange([
              Math.min(Number(e.target.value), hi - step),
              hi,
            ])
          }
        />
        <input
          type="range"
          aria-label="Maximum price"
          className="range-dual"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) =>
            onChange([lo, Math.max(Number(e.target.value), lo + step)])
          }
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs font-bold text-ink">
        <span className="rounded bg-canvas px-2 py-1">{formatINR(lo)}</span>
        <span className="rounded bg-canvas px-2 py-1">
          {hi >= max ? `${formatINR(max)}+` : formatINR(hi)}
        </span>
      </div>
    </div>
  );
}
