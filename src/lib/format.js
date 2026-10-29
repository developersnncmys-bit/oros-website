/** Money + pricing helpers. No catalogue data lives here. */

export const formatINR = (v) =>
  `₹${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

/** Percentage off list price, or 0 when there is no saving. */
export function discountPct(p) {
  if (!p) return 0;
  const price = Number(p.price) || 0;
  const compareAt = Number(p.compareAt) || 0;
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/**
 * Fold the chosen option values into a base price, option by option:
 * `price = (price + priceDelta) × priceMultiplier`. Mirrors the backend
 * pricing service so the cart preview matches the checkout total. An option
 * with no pricing set leaves the price untouched (delta 0 / multiplier 1).
 */
export function applyOptionPricing(base, options = []) {
  let price = Number(base) || 0;
  for (const o of options || []) {
    const delta = Number(o?.priceDelta) || 0;
    const m = Number(o?.priceMultiplier);
    price = (price + delta) * (Number.isFinite(m) && m > 0 ? m : 1);
  }
  return price;
}

/**
 * Unit price for a given quantity: options are applied on top of the base
 * price, then the matching bulk tier's discount percent is applied.
 */
export function unitPriceFor(product, qty, options = []) {
  const tier = [...(product?.bulkTiers || [])]
    .sort((a, b) => b.minQty - a.minQty)
    .find(
      (t) =>
        qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty)
    );
  const base = Number(product?.price) || 0;
  const withOptions = applyOptionPricing(base, options);
  const pct = tier ? Number(tier.discountPercent) || 0 : 0;
  return Math.max(0, Math.round(withOptions * (1 - pct / 100)));
}

/** A small named palette so colour-typed options can still render a swatch. */
export const COLORS = [
  { name: "Flame", hex: "#ff5a2c" },
  { name: "Amber", hex: "#ffb627" },
  { name: "Lilac", hex: "#7c5cff" },
  { name: "Mint", hex: "#00c9a7" },
  { name: "Sky", hex: "#4cb8ff" },
  { name: "Bone", hex: "#e8ddc8" },
  { name: "Aubergine", hex: "#2b1b4d" },
  { name: "Charcoal", hex: "#3f3f46" },
  { name: "Black", hex: "#18181b" },
  { name: "White", hex: "#f4f4f5" },
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Orange", hex: "#f97316" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Brown", hex: "#92400e" },
  { name: "Grey", hex: "#6b7280" },
  { name: "Gray", hex: "#6b7280" },
  { name: "Gold", hex: "#f59e0b" },
  { name: "Silver", hex: "#c0c0c0" },
];

export const colorHex = (name) => {
  if (!name) return "#ff5a2c";
  const hit = COLORS.find(
    (c) => c.name.toLowerCase() === String(name).toLowerCase()
  );
  if (hit) return hit.hex;
  // allow a raw hex value straight from a COLOR option
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(name)) return name;
  return "#ff5a2c";
};
