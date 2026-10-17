"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  CaretDown,
  ArrowUpRight,
  Check,
  X,
} from "@phosphor-icons/react";
import { formatINR } from "@/lib/format";
import { fetchCategories, fetchProducts } from "@/lib/catalog";

const MAX_PRODUCTS = 6;

function Highlight({ text, needle }) {
  const at = text.toLowerCase().indexOf(needle);
  if (!needle || at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-extrabold text-flame">
        {text.slice(at, at + needle.length)}
      </mark>
      {text.slice(at + needle.length)}
    </>
  );
}

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [scope, setScope] = useState(""); // category slug
  const [open, setOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const wrap = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();

  const needle = q.trim().toLowerCase();

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  const scopes = useMemo(
    () => [{ slug: "", name: "All Categories" }, ...categories],
    [categories]
  );
  const scopeLabel =
    categories.find((c) => c.slug === scope)?.name || "All Categories";
  const scopeId = categories.find((c) => c.slug === scope)?.id || null;

  // debounced live product search
  useEffect(() => {
    if (needle.length < 1) {
      setProducts([]);
      return;
    }
    const t = setTimeout(() => {
      const params = { limit: MAX_PRODUCTS, search: q.trim() };
      if (scopeId) params.category = scopeId;
      fetchProducts(params).then(({ products }) =>
        setProducts(products.slice(0, MAX_PRODUCTS))
      );
    }, 220);
    return () => clearTimeout(t);
  }, [needle, q, scopeId]);

  const catMatches = useMemo(() => {
    if (!needle || scope) return [];
    return categories
      .filter((c) => c.name.toLowerCase().includes(needle))
      .slice(0, 2);
  }, [categories, needle, scope]);

  const rows = useMemo(
    () => [
      ...products.map((p) => ({ type: "product", key: p.slug, item: p })),
      ...catMatches.map((c) => ({ type: "category", key: c.slug, item: c })),
      ...(needle ? [{ type: "all", key: "__all" }] : []),
    ],
    [products, catMatches, needle]
  );

  useEffect(() => setActive(-1), [needle]);

  useEffect(() => {
    if (!open && !scopeOpen) return;
    const close = () => {
      setOpen(false);
      setScopeOpen(false);
    };
    const onDown = (e) => {
      if (!wrap.current?.contains(e.target)) close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, scopeOpen]);

  const goToSearch = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (scope) params.set("category", scope);
    setOpen(false);
    router.push(params.toString() ? `/shop?${params}` : "/shop");
  };

  const choose = (row) => {
    setOpen(false);
    if (row.type === "product") router.push(`/shop/${row.item.slug}`);
    else if (row.type === "category")
      router.push(`/shop?category=${row.item.slug}`);
    else goToSearch();
  };

  const onKeyDown = (e) => {
    if (!open || rows.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? rows.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (active >= 0) {
        e.preventDefault();
        choose(rows[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && needle.length > 0;

  // on phones the input is squeezed between logo and icons, so the panel is
  // pinned full-width under the header instead of matching the input's width
  const [panelTop, setPanelTop] = useState(0);
  useEffect(() => {
    if (!showPanel) return;
    const place = () =>
      setPanelTop((wrap.current?.getBoundingClientRect().bottom || 0) + 8);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [showPanel]);

  return (
    <div ref={wrap} className="relative min-w-0 flex-1 lg:max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToSearch();
        }}
        className="flex h-12 items-center rounded-full border border-neon/40 bg-night-2 px-1"
      >
        <div className="relative hidden shrink-0 sm:block">
          <button
            type="button"
            onClick={() => {
              setScopeOpen((o) => !o);
              setOpen(false);
            }}
            aria-haspopup="listbox"
            aria-expanded={scopeOpen}
            className="flex h-10 items-center gap-2 rounded-full pl-4 pr-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
          >
            {scopeLabel}
            <CaretDown
              size={13}
              weight="bold"
              className={`text-white/50 transition-transform duration-200 ${
                scopeOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {scopeOpen && (
            <ul
              role="listbox"
              aria-label="Search within category"
              className="absolute left-0 top-full z-50 mt-2 max-h-80 w-56 overflow-y-auto rounded-xl border border-neon/40 bg-night-2 p-1.5 shadow-[0_24px_60px_-20px_rgba(10,5,20,0.85)]"
            >
              {scopes.map((c) => {
                const on = scope === c.slug;
                return (
                  <li key={c.slug || "all"}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => {
                        setScope(c.slug);
                        setScopeOpen(false);
                        // jumping scope from the dropdown also lands you on /shop
                        if (c.slug) router.push(`/shop?category=${c.slug}`);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                        on
                          ? "bg-neon/25 text-white"
                          : "text-white/65 hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      {c.name}
                      {on && (
                        <Check size={13} weight="bold" className="text-neon-2" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <span className="hidden h-6 w-px shrink-0 bg-white/15 sm:block" />

        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setScopeOpen(false);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search products…"
          aria-label="Search products"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/35"
        />

        {/* clear — wipes the typed text and closes the suggestions */}
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setActive(-1);
              setOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={15} weight="bold" />
          </button>
        )}

        <button
          type="submit"
          aria-label="Search"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neon text-white transition-colors hover:bg-neon-2"
        >
          <MagnifyingGlass size={18} weight="bold" />
        </button>
      </form>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          data-lenis-prevent
          style={{ "--panel-top": `${panelTop}px` }}
          className="fixed inset-x-3 top-(--panel-top) z-50 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-shell shadow-[0_24px_60px_-20px_rgba(10,5,20,0.6)] sm:absolute sm:inset-x-0 sm:top-full sm:mt-2 sm:max-h-none sm:overflow-hidden"
        >
          {rows.length <= 1 && (
            <p className="px-4 py-6 text-center text-sm text-ink-3">
              No products match “{q.trim()}”. Press Enter to search anyway.
            </p>
          )}

          {products.length > 0 && (
            <ul className="py-1.5">
              {products.map((p, i) => (
                <li key={p.slug}>
                  <button
                    role="option"
                    aria-selected={active === i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(rows[i])}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      active === i ? "bg-canvas" : "hover:bg-canvas"
                    }`}
                  >
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-canvas">
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">
                        <Highlight text={p.name} needle={needle} />
                      </span>
                      <span className="block truncate text-xs text-ink-3">
                        {p.categoryName}
                      </span>
                    </span>
                    <span className="shrink-0 font-display text-sm font-extrabold text-ink">
                      {formatINR(p.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {catMatches.length > 0 && (
            <ul className="border-t border-line py-1.5">
              {catMatches.map((c, j) => {
                const i = products.length + j;
                return (
                  <li key={c.slug}>
                    <button
                      role="option"
                      aria-selected={active === i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(rows[i])}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        active === i ? "bg-canvas" : "hover:bg-canvas"
                      }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-ink-4">
                        Category
                      </span>
                      <span className="text-sm font-bold text-ink">
                        <Highlight text={c.name} needle={needle} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            role="option"
            aria-selected={active === rows.length - 1}
            onMouseEnter={() => setActive(rows.length - 1)}
            onClick={goToSearch}
            className={`flex w-full items-center justify-between gap-2 border-t border-line px-4 py-3 text-left transition-colors ${
              active === rows.length - 1 ? "bg-canvas" : "hover:bg-canvas"
            }`}
          >
            <span className="text-sm font-bold text-flame">
              See all results for “{q.trim()}”
            </span>
            <ArrowUpRight size={15} weight="bold" className="text-flame" />
          </button>
        </div>
      )}
    </div>
  );
}
