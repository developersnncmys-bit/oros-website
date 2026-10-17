"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/**
 * When the URL carries `?focus=<id>` (set by a notification link), wait for the
 * element tagged `data-focus-id="<id>"` to render — the list it lives in may
 * still be loading — then scroll it into view and flash it.
 *
 * `onMatch(id)` fires once the id is present in `ids`, so a list can expand the
 * matching row before the scroll lands. Pass the ids currently rendered.
 */
export function useFocusRow(ids = [], onMatch) {
  const params = useSearchParams();
  const focus = params.get("focus");
  // bumped on every notification click, so the same row re-focuses
  const stamp = params.get("t");
  const matched = useRef(null);
  useEffect(() => {
    matched.current = null;
  }, [stamp]);

  // let the owning list open the row as soon as its data includes the id —
  // once per focus value, so a background reload can't reopen a closed row
  useEffect(() => {
    if (!focus || !onMatch || matched.current === focus) return;
    if (ids.some((id) => String(id) === String(focus))) {
      matched.current = focus;
      onMatch(focus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, ids.join(",")]);

  // scroll + flash once the node is in the DOM
  useEffect(() => {
    if (!focus) return;
    let tries = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const el = document.querySelector(
        `[data-focus-id="${CSS.escape(focus)}"]`
      );
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.classList.add("focus-flash");
        setTimeout(() => el.classList.remove("focus-flash"), 2400);
      } else if (tries++ < 30) {
        setTimeout(tick, 150);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [focus, stamp]);
}
