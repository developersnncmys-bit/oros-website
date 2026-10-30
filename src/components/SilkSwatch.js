// Filament-color swatch. One hex renders a flat disc; two or three hexes
// (silk / multi-tone filaments) render as even horizontal stripes so the
// label can still name the colour without a legend.
export default function SilkSwatch({ color, className = "h-7 w-7" }) {
  const stops = [color.hex, color.hexSecondary, color.hexTertiary].filter(
    Boolean
  );
  if (stops.length <= 1) {
    return (
      <span
        className={`${className} rounded-full ring-1 ring-inset ring-black/10`}
        style={{ backgroundColor: stops[0] || "#eee" }}
      />
    );
  }
  const slice = 100 / stops.length;
  const bg = stops
    .map((hex, i) => `${hex} ${i * slice}% ${(i + 1) * slice}%`)
    .join(", ");
  return (
    <span
      className={`${className} rounded-full ring-1 ring-inset ring-black/10`}
      style={{ background: `linear-gradient(90deg, ${bg})` }}
    />
  );
}
