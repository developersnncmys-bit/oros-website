"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as cartApi from "@/api/cart.api";
import * as productApi from "@/api/product.api";
import { normalizeProduct } from "@/lib/normalize";
import { tokenStore } from "@/lib/axios";
import { unitPriceFor, applyOptionPricing } from "@/lib/format";

// dedup key is name/value only — the option's pricing fields ride along on
// the line but must not change which line an add lands on
const variantKeyFor = (options = []) =>
  JSON.stringify(
    [...options]
      .map((o) => ({ name: o.name, value: o.value }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );

// products whose cart image was already refreshed this page load
const refreshedIds = new Set();

const lineKeyFor = (productId, options) =>
  `${productId}|${variantKeyFor(options)}`;

/** turn the selected options into display strings */
const readVariant = (options = []) => {
  const find = (re) =>
    options.find((o) => re.test(o.name || ""))?.value || "";
  return {
    color: find(/colou?r/i),
    material: find(/material|finish/i),
    // "Colour: Red · Size: Large" — every option the customer chose
    variantLabel: options
      .map((o) => `${o.name}: ${o.value}`)
      .join("  ·  "),
  };
};

const snapshotOf = (product) => ({
  name: product.name,
  slug: product.slug,
  image: product.image,
  price: product.price,
  compareAt: product.compareAt ?? null,
  taxRate: product.taxRate || 0,
  minQty: product.minQty || 1,
  bulkTiers: product.bulkTiers || [],
});

/**
 * The cart is customer-only — the backend rejects POST/PATCH/DELETE /cart for
 * anyone whose role isn't "user" (admin, staff, superAdmin). Read the role
 * straight off the persisted auth blob so we don't import authStore here and
 * create a circular dependency.
 */
const currentRole = () => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("oros.auth"))?.state?.user?.role ?? null;
  } catch {
    return null;
  }
};

// the storefront customer role (backend: authorize("user"))
export const isCustomerRole = (role) => role === "user";

// best-effort server push — never blocks the UI, never throws
const pushToServer = (fn) => {
  if (!tokenStore.get() || !isCustomerRole(currentRole())) return;
  Promise.resolve()
    .then(fn)
    .catch((e) => {
      if (process.env.NODE_ENV !== "production")
        console.warn("[cart sync]", e?.message || e);
    });
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      lines: [],
      // keys the customer removed locally before the server confirmed the
      // line — sync must honour these instead of resurrecting the row
      removedKeys: [],
      drawerOpen: false,
      justAddedKey: null,
      flight: null,
      hydrated: false,
      // the add-to-cart the shopper attempted while signed out — kept in
      // memory only, replayed once a customer login lands
      pendingAdd: null,

      add: (
        product,
        {
          options = [],
          qty = 1,
          origin = null,
          openCart = true,
          personalisation = {},
        } = {}
      ) => {
        if (!product?.id && !product?._id) return;

        // the store is customer-only — no token, no cart. Stash the attempt
        // so flushPendingAdd() can replay it after the login modal closes.
        if (!tokenStore.get()) {
          set({
            pendingAdd: { product, options, qty, openCart, personalisation },
          });
          if (typeof window !== "undefined")
            window.dispatchEvent(new CustomEvent("oros:require-auth"));
          return;
        }

        // signed in, but not as a customer (admin / staff) — the backend
        // would reject the add, so don't fake it in the UI either
        if (!isCustomerRole(currentRole())) {
          if (typeof window !== "undefined")
            window.dispatchEvent(
              new CustomEvent("oros:require-customer", {
                detail: {
                  message:
                    "Cart is for customer accounts only. Sign in with a customer account to shop.",
                },
              })
            );
          return;
        }

        const productId = product.id || product._id;
        const key = lineKeyFor(productId, options);
        const quantity = Math.max(1, Number(qty) || 1);

        // the same product + same option values is already a line — don't
        // stack it again; a different value (e.g. Medium vs Small) still adds
        if (get().lines.some((l) => l.key === key)) return false;

        set((state) => {
          const removedKeys = state.removedKeys.filter((k) => k !== key);
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              removedKeys,
              lines: state.lines.map((l) =>
                l.key === key
                  ? { ...l, qty: Math.min(l.qty + quantity, 99999) }
                  : l
              ),
              justAddedKey: key,
            };
          }
          return {
            removedKeys,
            lines: [
              ...state.lines,
              {
                key,
                productId,
                slug: product.slug,
                options,
                qty: quantity,
                personalisation,
                snapshot: snapshotOf(product),
              },
            ],
            justAddedKey: key,
          };
        });

        // persist to the server and keep the returned cart-item id on the
        // line — without it later qty / delete edits can't reach the backend
        pushToServer(async () => {
          const res = await cartApi.addToCart({
            product: productId,
            qty: quantity,
            selectedOptions: options,
            personalisation,
          });
          const serverId = res?.cart?._id || res?.cart?.id || null;
          if (!serverId) return;

          const line = get().lines.find((l) => l.key === key);
          if (!line) {
            // removed again before the server replied — undo it there too
            cartApi.removeCartItem(serverId).catch(() => {});
            return;
          }
          set((state) => ({
            lines: state.lines.map((l) =>
              l.key === key ? { ...l, serverId } : l
            ),
          }));
          // qty may have moved while the add was in flight
          if (line.qty !== quantity) {
            cartApi.updateCartQty(serverId, line.qty).catch(() => {});
          }
        });

        if (origin) {
          set({
            flight: {
              id: `${Date.now()}-${productId}`,
              rect: origin,
              image: product.image,
            },
          });
        } else if (openCart) {
          set({ drawerOpen: true });
        }
        return true;
      },

      setQty: (key, qty) => {
        const next = Math.max(0, Math.min(Number(qty) || 0, 99999));
        // grab the line BEFORE we mutate — a drop to 0 filters it out
        const line = get().lines.find((l) => l.key === key);
        if (!line) return;

        if (next === 0) {
          get().remove(key);
          return;
        }

        set((state) => ({
          lines: state.lines.map((l) =>
            l.key === key ? { ...l, qty: next } : l
          ),
        }));

        if (line.serverId) {
          pushToServer(() => cartApi.updateCartQty(line.serverId, next));
        }
      },

      remove: (key) => {
        const line = get().lines.find((l) => l.key === key);
        set((state) => ({
          lines: state.lines.filter((l) => l.key !== key),
          removedKeys: [
            ...state.removedKeys.filter((k) => k !== key),
            key,
          ],
        }));
        if (line?.serverId)
          pushToServer(() => cartApi.removeCartItem(line.serverId));
      },

      clear: () => {
        set({ lines: [], removedKeys: [] });
        pushToServer(() => cartApi.clearCart());
      },

      /**
       * Replay the add-to-cart the shopper attempted before signing in.
       * Called from authStore after a successful customer login — the
       * flyout drawer opens so they can see what landed.
       */
      flushPendingAdd: () => {
        const pending = get().pendingAdd;
        if (!pending) return;
        if (!tokenStore.get() || !isCustomerRole(currentRole())) return;
        set({ pendingAdd: null });
        // the pre-login click's DOM rect is stale after the modal, so skip
        // `origin`. Always open the drawer here — even a stashed buy-now
        // click (openCart: false) can't resume its checkout navigation
        // across login, so the drawer is the only feedback the shopper
        // gets that their click landed.
        get().add(pending.product, {
          options: pending.options,
          qty: pending.qty,
          openCart: true,
          personalisation: pending.personalisation || {},
        });
      },

      /**
       * The server cart carries no image, and a stored URL can go stale when
       * the admin re-uploads media — so pull each line's current image (and
       * bulk tiers) from the live product. Once per product per page load.
       */
      refreshImages: async () => {
        const ids = [...new Set(get().lines.map((l) => l.productId))].filter(
          (id) => id && !refreshedIds.has(id)
        );
        if (!ids.length) return;
        ids.forEach((id) => refreshedIds.add(id));

        const fresh = await Promise.all(
          ids.map((id) =>
            productApi
              .getProduct(id)
              .then((d) => normalizeProduct(d))
              .catch(() => {
                refreshedIds.delete(id); // let a later open retry
                return null;
              })
          )
        );
        const byId = new Map(
          fresh.filter(Boolean).map((p) => [String(p.id), p])
        );
        if (!byId.size) return;

        set((state) => ({
          lines: state.lines.map((l) => {
            const p = byId.get(String(l.productId));
            if (!p) return l;
            return {
              ...l,
              slug: p.slug || l.slug,
              snapshot: {
                ...l.snapshot,
                name: p.name || l.snapshot?.name,
                image: p.image || l.snapshot?.image,
                bulkTiers: p.bulkTiers?.length
                  ? p.bulkTiers
                  : l.snapshot?.bulkTiers || [],
              },
            };
          }),
        }));
      },

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      endFlight: () => set({ flight: null, drawerOpen: true }),

      /** merge whatever the server holds for this user into the local cart */
      syncFromServer: async () => {
        if (!tokenStore.get() || !isCustomerRole(currentRole())) return;
        try {
          const data = await cartApi.getCart();
          const serverItems = data.items || [];
          const tombstoned = new Set(get().removedKeys);
          const serverKeys = new Set();

          set((state) => {
            const byKey = new Map(state.lines.map((l) => [l.key, l]));

            for (const item of serverItems) {
              const p = item.product || {};
              const pid = p._id || item.product;
              const options = item.selectedOptions || [];
              const key = lineKeyFor(pid, options);
              serverKeys.add(key);

              // the customer deleted this row locally — drop it, and tell the
              // server (the delete never reached it, or lost a race)
              if (tombstoned.has(key)) {
                byKey.delete(key);
                if (item._id) cartApi.removeCartItem(item._id).catch(() => {});
                continue;
              }

              const local = byKey.get(key);
              byKey.set(key, {
                key,
                productId: pid,
                slug: p.slug,
                options,
                // a line we've reconciled trusts the server; a brand-new
                // local-only line keeps whatever it has until its add lands
                qty:
                  local && !local.serverId
                    ? Math.max(local.qty, item.qty)
                    : item.qty,
                serverId: item._id,
                snapshot: {
                  name: p.name,
                  slug: p.slug,
                  image: local?.snapshot?.image || "/placeholder.svg",
                  price: p.basePrice ?? item.unitPrice ?? 0,
                  compareAt: null,
                  taxRate: item.taxRate || 0,
                  minQty: p.minQty || 1,
                  bulkTiers: local?.snapshot?.bulkTiers || [],
                },
              });
            }

            // a line that carried a serverId but is gone server-side was
            // deleted elsewhere — let it go
            for (const [k, l] of byKey) {
              if (l.serverId && !serverKeys.has(k)) byKey.delete(k);
            }

            return { lines: [...byKey.values()], removedKeys: [] };
          });
        } catch (e) {
          if (process.env.NODE_ENV !== "production")
            console.warn("[cart sync]", e?.message || e);
        }
      },
    }),
    {
      name: "oros.cart",
      partialize: (s) => ({ lines: s.lines, removedKeys: s.removedKeys }),
      onRehydrateStorage: () => (state) => {
        // a non-customer session (admin / staff) must never hold a cart
        const drop = !!state?.lines?.length && !isCustomerRole(currentRole());
        useCartStore.setState({
          hydrated: true,
          ...(drop ? { lines: [], removedKeys: [] } : null),
        });
      },
    }
  )
);

/**
 * True when this exact product + option values is already a cart line.
 * Pass `null` options while the customer hasn't finished choosing.
 * Stays false until mounted so SSR and the first client render agree.
 */
export function useInCart(productId, options = []) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const key = productId && options ? lineKeyFor(productId, options) : null;
  const hit = useCartStore((s) => !!key && s.lines.some((l) => l.key === key));
  return mounted && hit;
}

/** Derived cart view — identical surface to the old CartContext. */
export function useCart() {
  const lines = useCartStore((s) => s.lines);
  const drawerOpen = useCartStore((s) => s.drawerOpen);
  const justAddedKey = useCartStore((s) => s.justAddedKey);
  const flight = useCartStore((s) => s.flight);

  const add = useCartStore((s) => s.add);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const endFlight = useCartStore((s) => s.endFlight);

  const detailed = lines.map((l) => {
    const snap = l.snapshot || {};
    const product = { ...snap, id: l.productId, _id: l.productId, slug: l.slug };
    // option pricing (priceDelta / priceMultiplier) rides on l.options and
    // is baked into every unit figure here
    const withOptions = (base) =>
      Math.max(0, Math.round(applyOptionPricing(base, l.options)));

    const unit = unitPriceFor(product, l.qty, l.options);
    const adjustedBase = withOptions(snap.price);
    const listUnit = snap.compareAt
      ? withOptions(snap.compareAt)
      : adjustedBase || unit;
    const tiers = [...(snap.bulkTiers || [])].sort(
      (a, b) => a.minQty - b.minQty
    );
    const nextTier = tiers.find((t) => l.qty < t.minQty) || null;
    const { color, material, variantLabel } = readVariant(l.options);
    return {
      ...l,
      product,
      color,
      material,
      variantLabel,
      unit,
      listUnit,
      nextTier,
      lineTotal: unit * l.qty,
      lineSaving: Math.max(0, (listUnit - unit) * l.qty),
      tiered: unit < (adjustedBase || unit),
    };
  });

  const count = detailed.reduce((n, l) => n + l.qty, 0);
  const subtotal = detailed.reduce((n, l) => n + l.lineTotal, 0);
  const savings = detailed.reduce((n, l) => n + l.lineSaving, 0);
  // real delivery is only known at checkout from the courier rate
  const delivery = 0;

  return {
    lines: detailed,
    count,
    // distinct cart documents (one per product + variant), not units
    itemCount: detailed.length,
    subtotal,
    savings,
    delivery,
    total: subtotal,
    drawerOpen,
    openDrawer,
    closeDrawer,
    justAddedKey,
    justAdded: detailed.find((l) => l.key === justAddedKey) || null,
    flight,
    endFlight,
    add,
    setQty,
    remove,
    clear,
  };
}
