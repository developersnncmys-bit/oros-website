export default function PolicyPage({ title, updated, children }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 lg:px-8 lg:py-16">
      <header className="mb-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">
          {title}
        </h1>
        {updated && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
            Last updated: {updated}
          </p>
        )}
      </header>
      <div className="prose-policy space-y-6 text-sm leading-relaxed text-ink-2 lg:text-base">
        {children}
      </div>
    </article>
  );
}

export function PolicySection({ heading, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold text-ink lg:text-2xl">
        {heading}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
