/**
 * The shop grid's query, shared by the server page (first-page prefetch)
 * and ShopClient (later fetches), so both build the exact same API params
 * and the client can tell whether the server already fetched what it needs.
 */

// products per page — the backend pages /product (page, limit → pagination)
export const PAGE_SIZE = 24;

export const apiSort = (s) =>
  s === "price-asc" ? "price_asc" : s === "price-desc" ? "price_desc" : undefined;

/** { sort, categoryId, subcategoryId, q, minPrice?, maxPrice? } → /product params */
export function toApiParams({ sort, categoryId, subcategoryId, q, minPrice, maxPrice }) {
  const p = { sort: apiSort(sort) };
  if (categoryId) p.category = categoryId;
  if (subcategoryId) p.subcategory = subcategoryId;
  if (q) p.search = q;
  if (minPrice != null) p.minPrice = minPrice;
  if (maxPrice != null) p.maxPrice = maxPrice;
  return p;
}

/** stable identity for "this filter set, this page" */
export const queryKey = (apiParams, page) =>
  JSON.stringify({ ...apiParams, page });
