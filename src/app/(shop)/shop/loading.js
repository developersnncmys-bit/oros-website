/** Product grid placeholder while the shop page's first results load. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse px-4 py-6 lg:px-6">
      <div className="h-8 w-56 rounded bg-canvas" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 15 }, (_, i) => (
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
