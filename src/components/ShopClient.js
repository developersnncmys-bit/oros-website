"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CaretDown, CaretLeft, CaretRight, X, Check } from "@phosphor-icons/react";
import ProductCard from "@/components/ProductCard";
import PriceRange from "@/components/PriceRange";
import { formatINR } from "@/lib/format";
import { fetchCategories, fetchSubcategories, fetchProducts } from "@/lib/catalog";
import { PAGE_SIZE, toApiParams, queryKey } from "@/lib/shopQuery";

const SORTS = [
  { id: "price-asc", label: "Price — low to high" },
  { id: "price-desc", label: "Price — high to low" },
  { id: "new", label: "Newest" },
];

/**
 * `initial` is the first page the server already fetched (see
 * app/(shop)/shop/page.js) — rendered straight away, no client round-trip.
 */
export default function ShopClient({ initial = null }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = params.get("q") || "";
  const categorySlug = params.get("category") || "";
  const subcategorySlug = params.get("subcategory") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  // the server only prerenders the unfiltered first page — when the URL
  // asks for anything else, start from the loader rather than flashing
  // the unfiltered grid until the filtered fetch lands
  const sortParam = params.get("sort");
  const showsInitial =
    !!initial &&
    !q &&
    !categorySlug &&
    !subcategorySlug &&
    page === 1 &&
    (!sortParam || sortParam === "price-asc");
  const seed = showsInitial ? initial : null;

  const [categories, setCategories] = useState(initial?.categories || []);
  const [subcategories, setSubcategories] = useState(
    initial?.subcategories || []
  );
  const [products, setProducts] = useState(seed?.products || []);
  const [loading, setLoading] = useState(!seed);
  const [total, setTotal] = useState(
    seed?.pagination?.total ?? seed?.products?.length ?? 0
  );
  const [totalPages, setTotalPages] = useState(
    Math.max(1, seed?.pagination?.totalPages || 1)
  );
  const filterSig = useRef(null);
  // the query whose results are on screen — skips refetching the same thing
  const shownKey = useRef(seed?.key || null);

  const [bounds, setBounds] = useState({ min: 0, max: 10000 });
  const [price, setPrice] = useState([0, 10000]);
  const [applied, setApplied] = useState([0, 10000]);
  const [sort, setSort] = useState(() => {
    const s = params.get("sort");
    return s && SORTS.some((x) => x.id === s) ? s : "price-asc";
  });
  const [openFilter, setOpenFilter] = useState(null);
  const bar = useRef(null);

  const priceTouched =
    price[0] > bounds.min || price[1] < bounds.max;

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug) || null,
    [categories, categorySlug]
  );
  const activeSubcategory = useMemo(
    () => subcategories.find((s) => s.slug === subcategorySlug) || null,
    [subcategories, subcategorySlug]
  );

  // categories once (unless the server already sent them)
  useEffect(() => {
    if (!initial?.categories?.length) fetchCategories().then(setCategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // price bounds — the catalogue's real ceiling, once
  useEffect(() => {
    fetchProducts({ limit: 200, sort: "price_desc" }).then(({ products }) => {
      const maxP = products.reduce((m, p) => Math.max(m, p.price || 0), 0);
      const ceil = Math.max(1000, Math.ceil(maxP / 500) * 500);
      setBounds({ min: 0, max: ceil });
      setPrice(([lo, hi]) => [lo, hi === 10000 ? ceil : Math.min(hi, ceil)]);
      setApplied(([lo, hi]) => [lo, hi === 10000 ? ceil : Math.min(hi, ceil)]);
    });
  }, []);

  // debounce the slider before it hits the API
  useEffect(() => {
    const t = setTimeout(() => setApplied(price), 350);
    return () => clearTimeout(t);
  }, [price]);

  // subcategories follow the active category
  useEffect(() => {
    if (!activeCategory) {
      setSubcategories([]);
      return;
    }
    fetchSubcategories(activeCategory.id).then(setSubcategories);
  }, [activeCategory]);

  // products follow category / subcategory / search
  useEffect(() => {
    const apiParams = toApiParams({
      sort,
      categoryId: activeCategory?.id,
      subcategoryId: activeSubcategory?.id,
      q,
      minPrice: applied[0] > bounds.min ? applied[0] : null,
      maxPrice: applied[1] < bounds.max ? applied[1] : null,
    });

    // price / sort live in state, not the URL — when any filter changes
    // while on page 3, drop back to page 1 instead of fetching a stale page
    const sig = JSON.stringify(apiParams);
    const changed = filterSig.current !== null && filterSig.current !== sig;
    filterSig.current = sig;
    if (changed && page > 1) {
      const sp = new URLSearchParams(params.toString());
      sp.delete("page");
      router.replace(sp.toString() ? `${pathname}?${sp}` : pathname);
      return;
    }

    // already showing exactly this (e.g. the price ceiling just loaded but
    // the filter itself did not change) — nothing to fetch
    const key = queryKey(apiParams, page);
    if (key === shownKey.current) return;

    // the server fetched this page while rendering the route — use it
    if (initial?.key === key) {
      shownKey.current = key;
      setProducts(initial.products || []);
      setTotal(initial.pagination?.total ?? initial.products?.length ?? 0);
      setTotalPages(Math.max(1, initial.pagination?.totalPages || 1));
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    fetchProducts({ ...apiParams, page, limit: PAGE_SIZE }).then(
      ({ products, pagination }) => {
        if (!alive) return;
        shownKey.current = key;
        setProducts(products);
        setTotal(pagination?.total ?? products.length);
        setTotalPages(Math.max(1, pagination?.totalPages || 1));
        setLoading(false);
      }
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activeSubcategory, q, applied, bounds, sort, page, initial]);

  useEffect(() => {
    const s = params.get("sort");
    if (s && SORTS.some((x) => x.id === s)) setSort(s);
  }, [params]);

  useEffect(() => {
    if (!openFilter) return;
    const onDown = (e) => {
      if (!bar.current?.contains(e.target)) setOpenFilter(null);
    };
    const onKey = (e) => e.key === "Escape" && setOpenFilter(null);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openFilter]);

  const setQuery = (next) => {
    const sp = new URLSearchParams(params.toString());
    // any filter change starts again from page 1
    if (!("page" in next)) sp.delete("page");
    Object.entries(next).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(sp.toString() ? `${pathname}?${sp}` : pathname);
  };

  const results = useMemo(() => {
    // price + category are filtered server-side; this only re-orders
    const by = {
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      new: (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    };
    return [...products].sort(by[sort] || by["price-asc"]);
  }, [products, sort]);

  const chips = priceTouched
    ? [
        {
          key: "price",
          label: `${formatINR(price[0])} – ${
            price[1] >= bounds.max ? `${formatINR(bounds.max)}+` : formatINR(price[1])
          }`,
          clear: () => setPrice([bounds.min, bounds.max]),
        },
      ]
    : [];

  const heading = q
    ? `“${q}”`
    : activeSubcategory?.name || activeCategory?.name || "All products";
  const tagline = q
    ? `${total} match${total === 1 ? "" : "es"} across the catalogue`
    : activeCategory?.tagline ||
      activeCategory?.description ||
      "Every object we print, in one place";

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 lg:px-8">
      <nav className="flex items-center gap-1.5 py-4 text-xs text-ink-3">
        <Link href="/" className="hover:text-flame">
          Home
        </Link>
        <CaretRight size={11} />
        <Link href="/shop" className="hover:text-flame">
          Shop
        </Link>
        {activeCategory && (
          <>
            <CaretRight size={11} />
            <Link
              href={`/shop?category=${activeCategory.slug}`}
              className="hover:text-flame"
            >
              {activeCategory.name}
            </Link>
          </>
        )}
        {activeSubcategory && (
          <>
            <CaretRight size={11} />
            <span className="font-semibold text-ink">
              {activeSubcategory.name}
            </span>
          </>
        )}
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-extrabold leading-none tracking-[-0.03em] text-ink">
            {heading}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-3">{tagline}</p>
        </div>
        <p className="text-sm font-semibold text-ink-3">
          <span className="font-display text-2xl font-extrabold text-ink">
            {total}
          </span>{" "}
          {total === 1 ? "product" : "products"}
          {totalPages > 1 && (
            <span className="ml-2 text-ink-4">
              · Page {Math.min(page, totalPages)} of {totalPages}
            </span>
          )}
        </p>
      </div>

      {/* ══ Category pills ══ */}
      <ChipScroller className="py-5" label="categories">
        <Pill
          active={!categorySlug}
          onClick={() => setQuery({ category: "", subcategory: "" })}
        >
          All
        </Pill>
        {categories.map((c) => (
          <Pill
            key={c.slug}
            active={categorySlug === c.slug}
            onClick={() =>
              setQuery({
                category: categorySlug === c.slug ? "" : c.slug,
                subcategory: "",
              })
            }
          >
            {c.name}
          </Pill>
        ))}
      </ChipScroller>

      {/* ══ Subcategory pills (only under an active category) ══ */}
      {activeCategory && subcategories.length > 0 && (
        <ChipScroller className="pb-4" label={`${activeCategory.name} subcategories`}>
          <Pill
            small
            active={!subcategorySlug}
            onClick={() => setQuery({ subcategory: "" })}
          >
            All {activeCategory.name}
          </Pill>
          {subcategories.map((s) => (
            <Pill
              key={s.slug}
              small
              active={subcategorySlug === s.slug}
              onClick={() =>
                setQuery({
                  subcategory: subcategorySlug === s.slug ? "" : s.slug,
                })
              }
            >
              {s.name}
            </Pill>
          ))}
        </ChipScroller>
      )}

      {/* ══ Filter bar ══ */}
      <div
        ref={bar}
        className="sticky top-34 z-30 -mx-4 flex flex-wrap items-center gap-2 border-y border-line bg-canvas px-4 py-3 sm:top-19 lg:mx-0 lg:rounded-xl lg:border"
      >
        <span className="hidden text-xs font-bold uppercase tracking-[0.14em] text-ink-4 lg:block">
          Filter
        </span>

        <FilterButton
          label={
            priceTouched
              ? `${formatINR(price[0])} – ${
                  price[1] >= bounds.max ? `${formatINR(bounds.max)}+` : formatINR(price[1])
                }`
              : "Price"
          }
          count={priceTouched ? 1 : 0}
          open={openFilter === "price"}
          onToggle={() => setOpenFilter((o) => (o === "price" ? null : "price"))}
          wide
        >
          <PriceRange
            min={bounds.min}
            max={bounds.max}
            step={50}
            value={price}
            onChange={setPrice}
          />
        </FilterButton>

        {activeCategory && subcategories.length > 0 && (
          <FilterButton
            label={activeSubcategory ? activeSubcategory.name : "Subcategory"}
            count={activeSubcategory ? 1 : 0}
            open={openFilter === "subcategory"}
            onToggle={() =>
              setOpenFilter((o) =>
                o === "subcategory" ? null : "subcategory"
              )
            }
            align="right"
          >
            <Option
              label={`All ${activeCategory.name}`}
              checked={!subcategorySlug}
              onChange={() => {
                setQuery({ subcategory: "" });
                setOpenFilter(null);
              }}
            />
            {subcategories.map((s) => (
              <Option
                key={s.slug}
                label={s.name}
                checked={subcategorySlug === s.slug}
                onChange={() => {
                  setQuery({
                    subcategory: subcategorySlug === s.slug ? "" : s.slug,
                  });
                  setOpenFilter(null);
                }}
              />
            ))}
          </FilterButton>
        )}

        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-ink-3">
          <span className="hidden sm:block">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-line bg-shell px-3 py-2 text-xs font-bold text-ink outline-none focus:border-flame"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-4">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={c.clear}
              className="group flex items-center gap-1.5 rounded-full border border-line bg-shell py-1.5 pl-3.5 pr-2.5 text-xs font-bold text-ink-2 transition-colors hover:border-flame hover:text-flame"
            >
              {c.label}
              <X
                size={12}
                weight="bold"
                className="text-ink-4 group-hover:text-flame"
              />
            </button>
          ))}
          <button
            onClick={() => setPrice([bounds.min, bounds.max])}
            className="px-2 text-xs font-bold text-flame hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ══ Grid ══ */}
      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-lg border border-line bg-shell"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-2xl border border-line bg-shell px-6 py-24 text-center">
          <p className="font-display text-xl font-extrabold text-ink">
            Nothing here yet
          </p>
          <p className="mt-2 max-w-sm text-sm text-ink-3">
            Try another category, or clear the price filter.
          </p>
          <Link
            href="/shop"
            className="mt-6 rounded-lg bg-flame px-6 py-2.5 text-sm font-extrabold text-ink transition-colors hover:bg-flame-dk"
          >
            View everything
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
          {results.map((p, i) => (
            // first row loads eagerly — it is what the customer sees first
            <ProductCard key={p.slug || p.id} product={p} priority={i < 5} />
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <Pager
          page={Math.min(page, totalPages)}
          totalPages={totalPages}
          onPage={(n) => setQuery({ page: n > 1 ? String(n) : "" })}
        />
      )}
    </div>
  );
}

/** Prev · 1 … 4 5 6 … 12 · Next — compact enough for a phone */
function Pager({ page, totalPages, onPage }) {
  const nums = [];
  const from = Math.max(2, page - 1);
  const to = Math.min(totalPages - 1, page + 1);
  nums.push(1);
  if (from > 2) nums.push("…l");
  for (let n = from; n <= to; n++) nums.push(n);
  if (to < totalPages - 1) nums.push("…r");
  nums.push(totalPages);

  const btn =
    "grid h-10 min-w-10 place-items-center rounded-lg border px-3 text-sm font-bold transition-colors";

  return (
    <div className="mt-10">
      <p className="mb-3 text-center text-sm font-semibold text-ink-3">
        Page <span className="font-extrabold text-ink">{page}</span> of{" "}
        <span className="font-extrabold text-ink">{totalPages}</span>
      </p>
      <nav
        aria-label="Pagination"
        className="flex flex-wrap items-center justify-center gap-1.5"
      >
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={`${btn} border-line text-ink-2 hover:border-ink-5 disabled:opacity-40`}
        >
          <CaretLeft size={14} weight="bold" />
        </button>
        {nums.map((n) =>
          typeof n === "string" ? (
            <span key={n} className="px-1 text-sm text-ink-4">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n)}
              aria-current={n === page ? "page" : undefined}
              className={`${btn} ${
                n === page
                  ? "border-ink bg-ink text-white"
                  : "border-line text-ink-2 hover:border-ink-5"
              }`}
            >
              {n}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className={`${btn} border-line text-ink-2 hover:border-ink-5 disabled:opacity-40`}
        >
          <CaretRight size={14} weight="bold" />
        </button>
      </nav>
    </div>
  );
}

/**
 * Horizontally scrollable chip row with edge fades and left/right nudge
 * buttons that only show while there's more content off-screen in that
 * direction. Recomputes on scroll, on resize, and after every render
 * (so it reacts to chips loading in asynchronously).
 */
function ChipScroller({ children, className = "", label = "items" }) {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const left = scrollLeft > 4;
    const right = scrollLeft + clientWidth < scrollWidth - 4;
    setEdges((p) => (p.left === left && p.right === right ? p : { left, right }));
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the arrows honest as chips mount / unmount
  useEffect(update);

  const nudge = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative -mx-4 lg:mx-0">
      {edges.left && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-canvas to-transparent" />
          <button
            type="button"
            aria-label={`Scroll ${label} left`}
            onClick={() => nudge(-1)}
            className="absolute left-1 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-line bg-shell text-ink shadow-[0_6px_16px_-6px_rgba(43,27,77,0.5)] transition-colors hover:border-ink-5"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
        </>
      )}
      <div
        ref={ref}
        className={`no-scrollbar flex gap-2 overflow-x-auto px-4 lg:px-0 ${className}`}
      >
        {children}
      </div>
      {edges.right && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-canvas to-transparent" />
          <button
            type="button"
            aria-label={`Scroll ${label} right`}
            onClick={() => nudge(1)}
            className="absolute right-1 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-line bg-shell text-ink shadow-[0_6px_16px_-6px_rgba(43,27,77,0.5)] transition-colors hover:border-ink-5"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </>
      )}
    </div>
  );
}

function Pill({ active, onClick, children, small = false }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border font-bold transition-all ${
        small ? "px-4 py-2 text-xs" : "px-5 py-2.5 text-sm"
      } ${
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-shell text-ink-2 hover:border-ink-5 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function FilterButton({ label, count, open, onToggle, wide, align = "left", children }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-bold transition-colors ${
          count > 0
            ? "border-flame bg-flame-lt text-flame"
            : open
              ? "border-ink-5 bg-shell text-ink"
              : "border-line bg-shell text-ink-2 hover:border-ink-5"
        }`}
      >
        {label}
        {count > 0 && (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-flame px-1 text-[10px] text-ink">
            {count}
          </span>
        )}
        <CaretDown
          size={12}
          weight="bold"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full z-40 mt-2 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-shell p-2 shadow-[0_18px_40px_-16px_rgba(43,27,77,0.4)] ${
            align === "right" ? "right-0" : "left-0"
          } ${wide ? "w-[19rem]" : "w-56"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Option({ label, checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors ${
        checked ? "bg-flame-lt text-flame" : "text-ink-2 hover:bg-canvas"
      }`}
    >
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded border-2 ${
          checked ? "border-flame bg-flame" : "border-ink-5"
        }`}
      >
        {checked && <Check size={10} weight="bold" className="text-white" />}
      </span>
      {label}
    </button>
  );
}
