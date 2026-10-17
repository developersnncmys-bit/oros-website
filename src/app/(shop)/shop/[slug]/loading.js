/** Product page placeholder — gallery on the left, buy box on the right. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1500px] animate-pulse px-5 py-6 lg:px-8">
      <div className="h-3 w-64 rounded bg-canvas" />
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="aspect-square rounded-2xl bg-canvas" />
        <div className="space-y-4">
          <div className="h-9 w-3/4 rounded bg-canvas" />
          <div className="h-4 w-1/2 rounded bg-canvas" />
          <div className="h-8 w-40 rounded bg-canvas" />
          <div className="flex gap-2.5 pt-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-10 w-20 rounded-full bg-canvas" />
            ))}
          </div>
          <div className="h-12 w-full rounded-xl bg-canvas" />
          <div className="h-12 w-full rounded-xl bg-canvas" />
        </div>
      </div>
    </div>
  );
}
