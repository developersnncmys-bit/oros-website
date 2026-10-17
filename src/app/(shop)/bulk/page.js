import { Suspense } from "react";
import BulkDesk from "@/components/BulkDesk";

export const metadata = {
  title: "Wholesale — OROS",
  description:
    "Price a production run against the live catalogue: per-unit rates at every tier, machine hours across the floor, and a realistic lead time.",
};

export default function BulkPage() {
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
