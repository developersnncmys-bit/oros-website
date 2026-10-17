"use client";

import { useState } from "react";
import { ArrowRight, Check } from "@phosphor-icons/react";

/**
 * New-object notification signup. Local-only for now — wire `email` to your
 * list provider where the comment marks it.
 */
export default function NotifyForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="flex items-center gap-2.5 rounded-xl border border-mint/30 bg-mint/10 px-4 py-3.5 text-sm font-semibold text-mint">
        <Check size={16} weight="bold" />
        You are on the list — expect an email when the next object lands.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: POST `email` to the mailing list provider.
        setDone(true);
      }}
      className="flex gap-2"
    >
      <input
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-label="Email address"
        className="h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-neon"
      />
      <button
        type="submit"
        aria-label="Notify me about new objects"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-neon text-white transition-colors hover:bg-neon-2"
      >
        <ArrowRight size={18} weight="bold" />
      </button>
    </form>
  );
}
