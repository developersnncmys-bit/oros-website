import { Suspense } from "react";
import BulkDesk from "@/components/BulkDesk";

export const metadata = {
  title: "Custom Order — OROS",
  description:
    "Tell us what you need — dimensions, materials, finishing, quantities — and the desk comes back with pricing and a lead time.",
};

export default function CustomPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1600px] px-4 py-20 text-sm text-ink-3 lg:px-8">
          Loading…
        </div>
      }
    >
      <BulkDesk />
    </Suspense>
  );
}
