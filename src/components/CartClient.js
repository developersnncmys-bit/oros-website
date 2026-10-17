"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash, ShoppingCart, Tag, CaretRight } from "@phosphor-icons/react";
import ProductImage from "@/components/ProductImage";
import { useCart } from "@/store/cartStore";
import { formatINR } from "@/lib/format";
import { useConfirm } from "@/components/ConfirmDialog";

export default function CartClient() {
  const router = useRouter();
  const {
    lines,
    count,
    subtotal,
    savings,
    delivery,
    total,
    setQty,
    remove,
    clear,
  } = useCart();
  const { confirm, ConfirmDialog } = useConfirm();

  if (lines.length === 0) return <EmptyCart />;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6">
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-3">
        <Link href="/" className="hover:text-flame">
          Home
        </Link>
        <CaretRight size={12} />
        <span className="font-semibold text-ink">Cart</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ══ Lines ══ */}
        <div className="rounded-lg border border-line bg-shell">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h1 className="font-display text-lg font-extrabold tracking-tight text-ink">
              My cart ({count})
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={async () => {
                  if (await confirm("Remove all items from your cart?"))
                    clear();
                }}
                className="text-xs font-bold text-ink-3 transition-colors hover:text-flame"
              >
                Clear cart
              </button>
              <Link
                href="/shop"
                className="text-xs font-bold text-flame hover:underline"
              >
                Continue shopping
              </Link>
            </div>
          </div>

          {lines.map((l) => {
            const nextTier = (l.product.bulkTiers || []).find(
              (t) => l.qty < t.minQty
            );
            return (
              <div
                key={l.key}
                className="flex gap-4 border-b border-line p-5 last:border-b-0"
              >
                <Link
                  href={`/shop/${l.slug}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-canvas"
                >
                  <ProductImage
                    src={l.product.image}
                    alt={l.product.name}
                    sizes="96px"
                    overlay
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/shop/${l.slug}`}
                        className="text-sm font-bold text-ink hover:text-flame"
                      >
                        {l.product.name}
                      </Link>
                      {l.options?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {l.options.map((o) => (
                            <span
                              key={o.name}
                              className="rounded bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-2"
                            >
                              <span className="text-ink-4">{o.name}:</span>{" "}
                              {o.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="font-display text-lg font-extrabold text-ink">
                        {formatINR(l.lineTotal)}
                      </p>
                      {l.listUnit > l.unit && (
                        <p className="text-xs text-ink-4 line-through">
                          {formatINR(l.listUnit * l.qty)}
                        </p>
                      )}
                    </div>
                  </div>

                  {l.tiered && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded bg-leaf-lt px-2 py-1 text-[11px] font-bold text-leaf">
                      <Tag size={11} />
                      Bulk price {formatINR(l.unit)}/unit applied
                    </p>
                  )}

                  {!l.tiered && nextTier && (
                    <p className="mt-2 text-[11px] font-semibold text-ink-3">
                      Add {nextTier.minQty - l.qty} more to drop to{" "}
                      <span className="font-bold text-leaf">
                        {formatINR(nextTier.price)}/unit
                      </span>
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <div className="flex items-center rounded-md border border-line">
                      <button
                        onClick={() => setQty(l.key, l.qty - 1)}
                        aria-label="Decrease quantity"
                        className="grid h-9 w-9 place-items-center text-ink-2 transition-colors hover:bg-canvas"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        value={l.qty}
                        onChange={(e) =>
                          setQty(l.key, Number(e.target.value) || 0)
                        }
                        aria-label={`Quantity of ${l.product.name}`}
                        className="no-spin h-9 w-14 border-x border-line text-center text-sm font-bold text-ink outline-none"
                      />
                      <button
                        onClick={() => setQty(l.key, l.qty + 1)}
                        aria-label="Increase quantity"
                        className="grid h-9 w-9 place-items-center text-ink-2 transition-colors hover:bg-canvas"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <span className="text-xs text-ink-3">
                      {formatINR(l.unit)} each
                    </span>

                    <button
                      onClick={async () => {
                        if (
                          await confirm(
                            `Remove ${l.product.name} from your cart?`,
                            "Remove"
                          )
                        )
                          remove(l.key);
                      }}
                      className="ml-auto flex items-center gap-1.5 text-xs font-bold text-ink-3 transition-colors hover:text-flame"
                    >
                      <Trash size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ Price details ══ */}
        <aside className="lg:sticky lg:top-[99px] lg:self-start">
          <div className="rounded-lg border border-line bg-shell">
            <h2 className="border-b border-line px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-4">
              Price details
            </h2>

            <div className="space-y-3 px-5 py-4 text-sm">
              <Row label={`Price (${count} item${count > 1 ? "s" : ""})`}>
                {formatINR(subtotal)}
              </Row>
              {savings > 0 && (
                <Row label="Discount" accent>
                  − {formatINR(savings)}
                </Row>
              )}
              <Row label="Delivery">Calculated at checkout</Row>

              <div className="border-t border-dashed border-line pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-extrabold text-ink">
                    Total payable
                  </span>
                  <span className="font-display text-xl font-extrabold text-ink">
                    {formatINR(total)}
                  </span>
                </div>
              </div>

              {savings > 0 && (
                <p className="rounded bg-leaf-lt px-3 py-2 text-center text-xs font-bold text-leaf">
                  You save {formatINR(savings)} on this order
                </p>
              )}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => router.push("/checkout")}
                className="w-full rounded-md bg-flame py-4 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
              >
                Place order
              </button>
            </div>
          </div>

          <p className="mt-3 px-1 text-[11px] leading-relaxed text-ink-3">
            Orders are printed after payment. In-stock objects dispatch within
            48 hours; bulk runs are scheduled with your account manager.
          </p>
        </aside>
      </div>
      {ConfirmDialog}
    </div>
  );
}

function Row({ label, children, accent = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-3">{label}</span>
      <span className={accent ? "font-bold text-leaf" : "font-semibold text-ink"}>
        {children}
      </span>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6">
      <div className="grid place-items-center rounded-lg border border-line bg-shell px-6 py-24 text-center">
        <span className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-canvas">
          <ShoppingCart size={32} className="text-ink-4" />
        </span>
        <h1 className="font-display text-2xl font-extrabold text-ink">
          Your cart is empty
        </h1>
        <p className="mt-2 max-w-sm text-sm text-ink-3">
          Nothing here yet. Everything on OROS is printed to order, so add
          something and we will start the queue.
        </p>
        <Link
          href="/shop"
          className="mt-7 rounded-md bg-flame px-8 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
        >
          Shop now
        </Link>
      </div>
    </div>
  );
}
