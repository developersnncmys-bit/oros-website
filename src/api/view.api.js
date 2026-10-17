import api, { API_URL } from "@/lib/axios";

/**
 * POST /view-product — record how long a visitor spent on a product page.
 * Auth is optional: a signed-in shopper is attributed, a guest isn't.
 *
 * Fired from page-unload / route-change, so it has to survive the page
 * going away — we use `navigator.sendBeacon` first and only fall back to
 * an axios POST (which won't complete on a hard navigation).
 *
 * @param {{ productId: string, duration: number }} view - duration in seconds
 */
export function trackProductView({ productId, duration } = {}) {
  const secs = Math.round(Number(duration) || 0);
  if (!productId || secs <= 0) return;

  const payload = { productId, duration: secs };

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      if (navigator.sendBeacon(`${API_URL}/view-product`, blob)) return;
    } catch {
      /* fall through to axios */
    }
  }

  api.post("/view-product", payload).catch(() => {});
}
