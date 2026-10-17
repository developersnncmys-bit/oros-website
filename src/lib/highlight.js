/**
 * Two-tone heading split: everything up to the last word reads brand lilac,
 * the last word reads flame orange. Used on banner/showreel titles, which
 * come from the admin as plain strings with no per-word colour data.
 */
export function splitLastWord(text) {
  const trimmed = (text || "").trim();
  const at = trimmed.lastIndexOf(" ");
  if (at === -1) return { lead: "", tail: trimmed };
  return { lead: trimmed.slice(0, at), tail: trimmed.slice(at + 1) };
}
