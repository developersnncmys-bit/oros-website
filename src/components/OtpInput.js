"use client";

import { useRef } from "react";

/**
 * Segmented OTP entry — one box per digit. `value` is the joined string,
 * `onChange` gets the new joined string, `onComplete` fires when all
 * `length` digits are filled.
 */
export default function OtpInput({
  length = 6,
  value = "",
  onChange,
  onComplete,
  autoFocus = true,
}) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const push = (next) => {
    const joined = next.join("").slice(0, length);
    onChange(joined);
    if (joined.length === length) onComplete?.(joined);
  };

  const setAt = (i, char) => {
    const next = [...digits];
    next[i] = char;
    push(next);
    if (char && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        setAt(i, "");
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
        setAt(i - 1, "");
      }
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!text) return;
    const next = Array.from({ length }, (_, i) => text[i] || "");
    push(next);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-between gap-2" onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, c);
          }}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-14 w-full rounded-xl border-2 border-line bg-canvas text-center font-display text-2xl font-extrabold text-ink outline-none transition-colors focus:border-flame focus:bg-shell"
        />
      ))}
    </div>
  );
}
