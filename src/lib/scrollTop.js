"use client";

/**
 * Jump to the top of the page. Used when a view swaps in place (quotation
 * sent, order placed) — the new content is shorter, so without this the
 * browser stays where the form's submit button was and lands on the footer.
 *
 * Lenis owns scrolling (see SmoothScroll), and a bare window.scrollTo gets
 * overridden by its own position on the next frame — so go through Lenis
 * when it is running.
 */
export function scrollToTop() {
  if (typeof window === "undefined") return;
  // run after React has painted the new, shorter view
  requestAnimationFrame(() => {
    const lenis = window.__lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo({ top: 0, behavior: "instant" });
  });
}
