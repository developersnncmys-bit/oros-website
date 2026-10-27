
import Link from "next/link";
import { ArrowRight, Percent, Tag } from "@phosphor-icons/react/ssr";
import BannerCarousel from "@/components/BannerCarousel";
import Showreel from "@/components/Showreel";
import Rail from "@/components/Rail";
import { formatINR } from "@/lib/format";



import {
  fetchProducts,
  fetchBestSellers,
  fetchCoupons,
  fetchBanners,
} from "@/lib/catalog";

// Served from the CDN and rebuilt in the background at most once a minute,
// so a click on "Home" never waits on the catalogue API.
export const revalidate = 60;

function couponHeadline(c) {
  if (c.discountType === "PERCENTAGE") return `${c.discountValue}% off`;
  return `${formatINR(c.discountValue)} off`;
}

export default async function Home() {
  const [bestsellers, pool, coupons, sliderBanners, showreelBanners] =
    await Promise.all([
      fetchBestSellers(12),
      fetchProducts({ limit: 40 }),
      fetchCoupons(),
      fetchBanners("SLIDER"),
      fetchBanners("SHOWREEL"),
    ]);

      

      

  const allProducts = pool.products;

  const newest = [...allProducts]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )
    .slice(0, 12);

  const bestOf = allProducts.slice(0, 12);
  const featuredBestsellers = bestsellers.length ? bestsellers : bestOf;

  return (
    <div className="space-y-3 pb-3">
      <BannerCarousel banners={sliderBanners} />

      {bestOf.length > 0 && (
        <Rail
          title="Explore our Collection"
          subtitle="Everything we print, in one place"
          products={bestOf}
          href="/shop"
        />
      )}

      {/* ── Biggest discounts — live coupons ── */}
      {coupons.length > 0 && (
        <section className="bg-shell">
          <div className="mx-auto max-w-[1440px] px-4 lg:px-6">
            <div className="flex items-center justify-between gap-4 py-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-lt">
                  <Percent size={16} className="text-gold-dk" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-extrabold tracking-tight text-ink lg:text-2xl">
                    Biggest discounts
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-3 lg:text-sm">
                    Apply these codes at checkout
                  </p>
                </div>
              </div>
              <Link
                href="/shop"
                className="shrink-0 rounded-md bg-flame px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-flame-dk lg:text-sm"
              >
                Shop now
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-6 sm:grid-cols-3 lg:grid-cols-4">
              {coupons.slice(0, 8).map((c) => (
                <div
                  key={c._id || c.code}
                  className="relative overflow-hidden rounded-lg border border-dashed border-flame/40 bg-flame-lt p-4"
                >
                  <div className="flex items-center gap-2 text-flame">
                    <Tag size={15} weight="fill" />
                    <span className="font-display text-lg font-extrabold">
                      {couponHeadline(c)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-ink-2">
                    Code{" "}
                    <span className="rounded bg-white px-1.5 py-0.5 font-mono font-bold text-ink">
                      {c.code}
                    </span>
                  </p>
                  {c.minOrderValue > 0 && (
                    <p className="mt-1 text-[11px] text-ink-3">
                      On orders over {formatINR(c.minOrderValue)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {featuredBestsellers.length > 0 && (
        <Rail
          title="Popular Picks"
          subtitle="What everyone else is printing"
          products={featuredBestsellers}
          href="/shop"
          showOptions
        />
      )}

      {/* ── Bulk strip ── */}
      <section className="bg-shell">
        <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6">
          <Link
            href="/bulk"
            className="group relative flex flex-col gap-6 overflow-hidden rounded-xl bg-ink px-6 py-9 sm:px-10 lg:flex-row lg:items-center lg:justify-between"
          >
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-40 blur-3xl"
              style={{
                background: "radial-gradient(circle, #7c5cff 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <span className="mb-3 inline-block rounded-full bg-gold px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink">
                Bulk & wholesale
              </span>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
                Buying in bulk? Your price drops automatically.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/65 lg:text-base">
                Corporate gifts, retail stock, event merch, spare parts. Tier
                pricing is applied in the cart the moment your quantity
                qualifies — no negotiation needed.
              </p>
            </div>
            <span className="relative inline-flex shrink-0 items-center gap-2 rounded-md bg-flame px-7 py-3.5 text-sm font-extrabold text-ink transition-colors group-hover:bg-gold group-hover:text-ink">
              Get a bulk quote
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </span>
          </Link>
        </div>
      </section>

      <Showreel banners={showreelBanners} />

      {newest.length > 0 && (
        <Rail
          title="New & noteworthy"
          subtitle="Fresh off the print farm"
          products={newest}
          href="/shop"
        />
      )}

    </div>
  );
}
