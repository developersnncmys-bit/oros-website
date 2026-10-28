import { Suspense } from "react";
import ShopClient from "@/components/ShopClient";
import { PAGE_SIZE, toApiParams, queryKey } from "@/lib/shopQuery";
import { fetchCategories, fetchProducts } from "@/lib/catalog";

export const metadata = {
  title: "Shop all products — OROS",
  description:
    "Browse 3D printed figurines, lighting, desk storage, decor and seasonal pieces. Filter by category, material, colour and price.",
};

// Served from the CDN and rebuilt in the background at most once a minute.
export const revalidate = 10;

/**
 * The unfiltered first page ("all products", default sort) is fetched here
 * and cached with the page, so opening the shop never waits on the API.
 * Reading searchParams here would force a fresh server render on every
 * click — instead ShopClient reads the URL and, when a filter / search /
 * page is set, fetches that view itself (initial.key won't match).
 */
export default async function ShopPage() {
  const apiParams = toApiParams({ sort: "price-asc" });
  const [categories, { products, pagination }] = await Promise.all([
    fetchCategories(),
    fetchProducts({ ...apiParams, page: 1, limit: PAGE_SIZE }),
  ]);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1440px] px-4 py-20 text-sm text-ink-3 lg:px-6">
          Loading products…
        </div>
      }
    >
      <ShopClient
        initial={{
          key: queryKey(apiParams, 1),
          products,
          pagination,
          categories,
          subcategories: [],
        }}
      />
    </Suspense>
  );
}
