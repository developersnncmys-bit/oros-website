/**
 * Catalogue data access. Everything the storefront shows about products
 * and categories comes through here — always from the live API, always
 * normalised. Used by both server components and client components.
 */

import * as productApi from "@/api/product.api";
import * as categoryApi from "@/api/category.api";
import * as subcategoryApi from "@/api/subcategory.api";
import * as couponApi from "@/api/coupon.api";
import * as bannerApi from "@/api/banner.api";
import {
  normalizeProduct,
  normalizeProductList,
  normalizeCategoryList,
  normalizeSubcategoryList,
  normalizeBannerList,
} from "@/lib/normalize";

const IS_OBJECT_ID = /^[a-f\d]{24}$/i;

/*
--------------------------------
Short-lived response cache

Every storefront page used to wait on the API for each visit — and the
API sits on a slow host. Catalogue reads are kept for FRESH_MS and then
served stale for up to STALE_MS while one background call refreshes
them, so a visitor almost never waits on the backend. Requests already
in flight are shared, so a page and its generateMetadata (or two
components) asking for the same thing make one call. Failures are never
cached — the next request tries again.
--------------------------------
*/
const FRESH_MS = 10 * 1000;
const STALE_MS = 60 * 1000;
const MAX_ENTRIES = 300;
const cache = new Map(); // key -> { value, at, pending }

function cached(key, load) {
  const now = Date.now();
  const hit = cache.get(key);

  const refresh = () => {
    const pending = load()
      .then((value) => {
        cache.set(key, { value, at: Date.now(), pending: null });
        if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
        return value;
      })
      .catch((err) => {
        const cur = cache.get(key);
        if (cur?.pending === pending) {
          if ("value" in cur) cache.set(key, { ...cur, pending: null });
          else cache.delete(key);
        }
        throw err;
      });
    cache.set(key, { ...(hit || {}), pending });
    return pending;
  };

  if (hit && "value" in hit) {
    const age = now - hit.at;
    if (age < FRESH_MS) return Promise.resolve(hit.value);
    if (age < STALE_MS) {
      // serve what we have now, refresh behind it
      if (!hit.pending) refresh().catch(() => {});
      return Promise.resolve(hit.value);
    }
  }
  return hit?.pending || refresh();
}

const keyOf = (name, params) => `${name}:${JSON.stringify(params ?? null)}`;

const swallow = (fallback) => (err) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[catalog]", err?.message || err);
  }
  // Catalogue pages are cached (ISR). When a background re-render on the
  // server hits an API failure, let it fail: Next then keeps serving the
  // last good page instead of caching an empty one (or a false 404) for a
  // minute. During `next build` and in the browser, fall back as before.
  if (
    typeof window === "undefined" &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    throw err;
  }
  return fallback;
};

export async function fetchProducts(params = {}) {
  const query = { limit: 60, status: "PUBLISHED", ...params };
  const data = await cached(keyOf("products", query), () => productApi.listProducts(query))
    .catch(swallow({ products: [], pagination: { total: 0 } }));
  return {
    products: normalizeProductList(data.products),
    pagination: data.pagination || { total: data.products?.length || 0 },
  };
}

export async function fetchBestSellers(limit = 10) {
  const data = await cached(keyOf("bestSellers", limit), () =>
      productApi.listBestSellers({ limit })
    )
    .catch(swallow({ products: [] }));
  return normalizeProductList(data.products);
}

export async function fetchSuggested(id, limit = 8) {
  if (!id) return [];
  const data = await cached(keyOf("suggested", [id, limit]), () =>
      productApi.listSuggestedProducts(id, { limit })
    )
    .catch(swallow({ products: [] }));
  return normalizeProductList(data.products);
}

/** Full PDP payload by slug (or id). Returns null when nothing matches. */
export async function fetchProductBySlug(slugOrId) {
  if (!slugOrId) return null;

  let id = IS_OBJECT_ID.test(slugOrId) ? slugOrId : null;

  if (!id) {
    const list = await cached(keyOf("products", { limit: 200, status: "PUBLISHED" }), () =>
        productApi.listProducts({ limit: 200, status: "PUBLISHED" })
      )
      .catch(swallow({ products: [] }));
    const hit = (list.products || []).find((p) => p.slug === slugOrId);
    if (!hit) return null;
    id = hit._id;
  }

  const data = await cached(keyOf("product", id), () =>
    productApi.getProduct(id)
  ).catch(swallow(null));
  if (!data) return null;
  return normalizeProduct(data);
}

export async function fetchCategories() {
  const data = await cached(keyOf("categories", 100), () =>
      categoryApi.listCategories({ limit: 100 })
    )
    .catch(swallow({ category: [] }));
  return normalizeCategoryList(data.category);
}

export async function fetchSubcategories(categoryId) {
  const params = { limit: 200 };
  if (categoryId) params.category = categoryId;
  const data = await cached(keyOf("subcategories", params), () =>
      subcategoryApi.listSubcategories(params)
    )
    .catch(swallow({ subCategory: [] }));
  return normalizeSubcategoryList(data.subCategory);
}

/** type: "SLIDER" | "SHOWREEL" — only the live ones, in admin-set order */
export async function fetchBanners(type) {
  const data = await cached(keyOf("banners", type), () =>
      bannerApi.listBanners({ type, isActive: true })
    )
    .catch(swallow({ banners: [] }));
  return normalizeBannerList(data.banners);
}

export async function fetchCoupons() {
  const data = await cached(keyOf("coupons", 50), () =>
    couponApi.listCoupons({ limit: 50 })
  ).catch(swallow({ coupons: [] }));
  const now = Date.now();
  return (data.coupons || []).filter(
    (c) =>
      c.isActive !== false &&
      (!c.endDate || new Date(c.endDate).getTime() >= now)
  );
}
