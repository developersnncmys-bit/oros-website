/**
 * Shown the instant a storefront link is clicked, while the server
 * fetches the page's data — so navigation never looks frozen.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse space-y-6 px-4 py-6 lg:px-6">
      <div className="h-[clamp(180px,32vw,420px)] rounded-2xl bg-canvas" />
      <div className="h-6 w-48 rounded bg-canvas" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square rounded-xl bg-canvas" />
            <div className="h-3 w-3/4 rounded bg-canvas" />
            <div className="h-3 w-1/3 rounded bg-canvas" />
          </div>
        ))}
      </div>
    </div>
  );
}
