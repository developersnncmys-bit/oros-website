import { Suspense } from "react";
import AccountClient from "@/components/AccountClient";

export const metadata = { title: "Your account — OROS" };

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1100px] px-4 py-20 text-sm text-ink-3 lg:px-6">
          Loading…
        </div>
      }
    >
      <AccountClient />
    </Suspense>
  );
}
