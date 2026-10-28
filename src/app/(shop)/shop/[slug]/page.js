import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import Rail from "@/components/Rail";
import { fetchProductBySlug, fetchSuggested, fetchProducts } from "@/lib/catalog";

// Product pages are served from the CDN and rebuilt in the background at
// most once a minute. Published products are prerendered at build time
// (a cold render costs several sequential API calls); products added later
// are rendered on their first visit and cached from then on.
export const revalidate = 10;

export async function generateStaticParams() {
  const { products } = await fetchProducts({ limit: 200 });
  return products.filter((p) => p.slug).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) return { title: "Product not found — OROS" };
  return {
    title: `${product.name} — OROS`,
    description: product.blurb || product.description?.slice(0, 150),
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) notFound();

  const related = await fetchSuggested(product.id, 10);

  return (
    <div className="space-y-3 pb-3">
      <ProductDetail product={product} />
      {related.length > 0 && (
        <Rail
          title="Similar products"
          subtitle={
            product.categoryName ? `More from ${product.categoryName}` : "You may also like"
          }
          products={related}
          href={
            product.categoryId
              ? `/shop?category=${product.category}`
              : "/shop"
          }
        />
      )}
    </div>
  );
}
