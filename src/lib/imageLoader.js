"use client";

/**
 * Global next/image loader (wired in next.config.mjs).
 *
 * Cloudinary images are resized and re-encoded by Cloudinary's own CDN —
 * `f_auto` serves WebP/AVIF, `q_auto` picks the compression, `w_` matches
 * the size the layout actually needs. That skips the Next.js optimiser,
 * whose first hit on each image (download from Cloudinary, resize, cache)
 * was the 2–5 s delay users saw.
 *
 * Anything else (local /public files, other hosts) is served as-is; the
 * `w` query is ignored by the server and only keeps next/image from
 * warning that the loader ignores width.
 */
export default function imageLoader({ src, width }) {
  const marker = "/image/upload/";
  const i = src.indexOf(marker);

  if (src.includes("res.cloudinary.com") && i !== -1) {
    const params = [
      "f_auto",
      // Cloudinary picks the compression per image — better than a flat 75
      "q_auto",
      "c_limit",
      `w_${width}`,
    ].join(",");
    const at = i + marker.length;
    return `${src.slice(0, at)}${params}/${src.slice(at)}`;
  }

  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
