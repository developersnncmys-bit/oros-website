"use client";

import { useCallback, useRef, useState } from "react";

/**
 * In-app stand-in for window.confirm — a small centered popup instead of
 * the browser's native dialog. `confirm(message)` resolves true/false the
 * same way, so call sites just add an `await`.
 */
export function useConfirm() {
  const [state, setState] = useState(null); // { message, confirmLabel } | null
  const resolver = useRef(null);

  const confirm = useCallback((message, confirmLabel = "Confirm") => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({ message, confirmLabel });
    });
  }, []);

  const settle = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  };

  const ConfirmDialog = !state ? null : (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/50 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && settle(false)}
    >
      <div className="w-full max-w-sm rounded-2xl bg-shell p-5 shadow-2xl">
        <p className="text-sm font-semibold text-ink">{state.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => settle(false)}
            className="rounded-md px-4 py-2 text-xs font-bold text-ink-3 transition-colors hover:bg-canvas"
          >
            Cancel
          </button>
          <button
            onClick={() => settle(true)}
            className="rounded-md bg-flame px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-flame-dk"
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return { confirm, ConfirmDialog };
}
