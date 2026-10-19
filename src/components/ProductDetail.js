"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CaretRight,
  Minus,
  Play,
  Plus,
  ShoppingCart,
  Lightning,
  ShieldCheck,
  Check,
  Cube,
  Stack,
  ArrowRight,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
} from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import ProductImage from "@/components/ProductImage";
import { trackProductView } from "@/api/view.api";
import { useCartStore, useInCart } from "@/store/cartStore";
import { useAuthStore, useUser } from "@/store/authStore";
import { formatINR, colorHex, unitPriceFor } from "@/lib/format";

// at this quantity the PDP nudges the customer into the bulk-quote flow
const BULK_THRESHOLD = 25;

export default function ProductDetail({ product: p }) {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const token = useAuthStore((s) => s.token);
  const { isSignedIn, isCustomer } = useUser();

  // one selected value per option, keyed by option name. Nothing is
  // pre-selected — if a product has variants the customer must pick each
  // one so the cart line records the exact variant they wanted.
  const [selected, setSelected] = useState({});

  // Filament → color family → color is a three-step picker. The cart
  // still records a single Filament record, which we resolve from the
  // picked color (each color belongs to exactly one filament).
  //
  // `selectedFamilyKey` is a family id, or "__none__" when the matching
  // filaments have no color family assigned yet (legacy data). All three
  // selections must be made for the product to be addable to cart.
  const [selectedBaseType, setSelectedBaseType] = useState("");
  const [selectedFamilyKey, setSelectedFamilyKey] = useState("");
  const [selectedColorId, setSelectedColorId] = useState("");

  const filamentsList = p.filaments || [];
  const hasFilaments = filamentsList.length > 0;

  const baseTypes = useMemo(
    () =>
      [
        ...new Set(filamentsList.map((f) => f.type).filter(Boolean)),
      ].sort(),
    [filamentsList]
  );

  const filamentsInBase = useMemo(
    () => filamentsList.filter((f) => f.type === selectedBaseType),
    [filamentsList, selectedBaseType]
  );

  const familiesInBase = useMemo(() => {
    const map = new Map();
    filamentsInBase.forEach((f) => {
      const key = f.colorFamily?.id || "__none__";
      const name = f.colorFamily?.name || "Unclassified";
      if (!map.has(key)) map.set(key, { key, name });
    });
    return [...map.values()];
  }, [filamentsInBase]);

  // Colors from every filament record that matches base + family, each
  // tagged with its parent filament so the cart knows the exact variant.
  const colorsInFamily = useMemo(() => {
    if (!selectedBaseType || !selectedFamilyKey) return [];
    const list = [];
    filamentsInBase
      .filter(
        (f) => (f.colorFamily?.id || "__none__") === selectedFamilyKey
      )
      .forEach((f) => {
        f.colors.forEach((c) => {
          list.push({
            ...c,
            filamentId: f.id,
            filamentName: f.name,
            finish: f.finish,
            priceDelta: f.priceDelta,
            priceMultiplier: f.priceMultiplier,
          });
        });
      });
    return list;
  }, [filamentsInBase, selectedBaseType, selectedFamilyKey]);

  const selectedColor = useMemo(
    () => colorsInFamily.find((c) => c.id === selectedColorId) || null,
    [colorsInFamily, selectedColorId]
  );

  const selectedFilament = useMemo(() => {
    if (!selectedColor) return null;
    return (
      filamentsList.find((f) => f.id === selectedColor.filamentId) || null
    );
  }, [filamentsList, selectedColor]);

  const selectedFamily = useMemo(
    () => familiesInBase.find((f) => f.key === selectedFamilyKey) || null,
    [familiesInBase, selectedFamilyKey]
  );

  const [qty, setQty] = useState(p.minQty || 1);
  const [activeSlide, setActiveSlide] = useState(0);
  const [added, setAdded] = useState(false);
  const [optError, setOptError] = useState("");
  const art = useRef(null);

  // image zoom: hover (desktop) pans a magnified view that tracks the cursor;
  // the pinned flag lets touch devices tap-to-lock the zoom and tap again to
  // release. scale is cycled through ZOOM_LEVELS by the + / − buttons.
  const ZOOM_LEVELS = [1, 1.75, 2.5, 3.5];
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [zoomHover, setZoomHover] = useState(false);
  const [zoomPinned, setZoomPinned] = useState(false);
  const [zoomStep, setZoomStep] = useState(2); // index into ZOOM_LEVELS → 2.5x

  // gallery = every product image, then every product video. A video slide
  // plays inline; its thumbnail is the poster frame with a play badge.
  const slides = useMemo(() => {
    const imgs = (p.images?.length ? p.images : [p.image]).map((url) => ({
      kind: "image",
      url,
    }));
    const vids = (p.videos || []).map((v) => ({
      kind: "video",
      url: v.url,
      poster: v.poster || "",
      alt: v.alt || "",
    }));
    return [...imgs, ...vids];
  }, [p.images, p.image, p.videos]);

  const active = slides[activeSlide] || slides[0];

  const canZoom = active?.kind !== "video";
  const zoomOn = canZoom && (zoomHover || zoomPinned);
  const zoomScale = ZOOM_LEVELS[zoomStep];

  const updateZoomPos = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  // switching slides or hitting a video should drop any active zoom
  useEffect(() => {
    setZoomHover(false);
    setZoomPinned(false);
  }, [activeSlide]);

  // ── Track dwell time on this PDP ──
  // Clock starts on mount; the elapsed seconds are reported once, on
  // route-change (effect cleanup) or when the tab/window goes away
  // (pagehide). The `reported` guard keeps those two paths from
  // double-counting the same visit.
  useEffect(() => {
    const productId = p.id || p._id;
    if (!productId) return;

    const startedAt = Date.now();
    let reported = false;
    const report = () => {
      if (reported) return;
      reported = true;
      trackProductView({
        productId,
        duration: (Date.now() - startedAt) / 1000,
      });
    };

    window.addEventListener("pagehide", report);
    return () => {
      window.removeEventListener("pagehide", report);
      report();
    };
  }, [p.id, p._id]);

  // the option-value objects the customer has actually picked — these carry
  // priceDelta / priceMultiplier and drive both the displayed price and the
  // cart line
  const chosenValues = useMemo(
    () => {
      const fromOptions = (p.options || [])
        .map((o) => (o.values || []).find((v) => v.value === selected[o.name]))
        .filter(Boolean);
      // Filament selection carries its own priceDelta/multiplier; fold it in
      // the same way option values do so the pricing math stays uniform.
      if (selectedFilament) {
        fromOptions.push({
          priceDelta: selectedFilament.priceDelta,
          priceMultiplier: selectedFilament.priceMultiplier,
        });
      }
      return fromOptions;
    },
    [p.options, selected, selectedFilament]
  );

  const unit = useMemo(
    () => unitPriceFor(p, qty, chosenValues),
    [p, qty, chosenValues]
  );
  // the single-unit price with the same options applied — so "bulk rate"
  // only lights up when the tier actually discounts, not because an option
  // surcharge moved the number
  const optionedBase = useMemo(
    () => unitPriceFor(p, p.minQty || 1, chosenValues),
    [p, chosenValues]
  );
  const tiered = unit < optionedBase;
  const lineTotal = unit * qty;
  const off =
    p.compareAt && p.compareAt > unit
      ? Math.round(((p.compareAt - unit) / p.compareAt) * 100)
      : 0;

  const tiers = useMemo(
    () => [{ minQty: p.minQty || 1, price: p.price }, ...(p.bulkTiers || [])],
    [p]
  );
  const tierIndex = tiers.reduce(
    (best, t, i) => (qty >= t.minQty ? i : best),
    0
  );
  const nextTier = tiers[tierIndex + 1];

  // carries the picked variant over to the bulk-quote page
  const bulkOptsParam = Object.keys(selected).length
    ? `&options=${encodeURIComponent(JSON.stringify(selected))}`
    : "";

  // a variant product needs every option picked before it can go to the
  // bulk desk — same rule as add-to-cart
  const optionsRef = useRef(null);
  const guardBulk = (e) => {
    const missing = missingOption();
    if (!missing) return;
    e.preventDefault();
    setOptError(`Please select ${missing.name} before starting a bulk order`);
    optionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectedOptions = () => {
    const list = (p.options || []).map((o) => {
      const v = (o.values || []).find((x) => x.value === selected[o.name]);
      return {
        name: o.name,
        value: selected[o.name],
        priceDelta: Number(v?.priceDelta) || 0,
        priceMultiplier:
          v?.priceMultiplier != null ? Number(v.priceMultiplier) : 1,
      };
    });
    // Filament + color ride on the same options array so the cart's
    // existing variant-key logic treats them as part of the identity.
    if (selectedFilament) {
      list.push({
        name: "Filament",
        value: selectedFilament.name,
        priceDelta: selectedFilament.priceDelta,
        priceMultiplier: selectedFilament.priceMultiplier,
      });
    }
    if (selectedColor) {
      list.push({
        name: "Color",
        value: selectedColor.name,
        priceDelta: 0,
        priceMultiplier: 1,
      });
    }
    return list;
  };

  // every option must be chosen — a variant product can't go in the cart
  // until we know which variant it is. Filament + color follow the same rule
  // when the product supports filaments.
  const missingOption = () => {
    const miss = (p.options || []).find((o) => !selected[o.name]);
    if (miss) return miss;
    if (hasFilaments && !selectedBaseType) return { name: "filament" };
    if (hasFilaments && !selectedFamilyKey) return { name: "color family" };
    if (hasFilaments && !selectedColorId) return { name: "color" };
    return null;
  };

  // this exact variant is already a cart line — "Add" becomes "Already added"
  const inCart = useInCart(
    p.id || p._id,
    missingOption() ? null : selectedOptions()
  );

  const doAdd = (thenCheckout = false) => {
    if (!token) {
      setOptError("");
      window.dispatchEvent(new CustomEvent("oros:require-auth"));
      return false;
    }
    if (isSignedIn && !isCustomer) {
      setOptError(
        "Cart and checkout are for customer accounts only. Sign in with a customer account to shop."
      );
      return false;
    }
    const missing = missingOption();
    if (missing) {
      setOptError(`Please select ${missing.name} before adding to cart`);
      return false;
    }
    setOptError("");
    if (inCart) {
      // same variant again — never stack it; buy-now just carries on
      if (!thenCheckout) openDrawer();
      return true;
    }
    add(p, {
      options: selectedOptions(),
      qty,
      origin: thenCheckout
        ? null
        : art.current?.getBoundingClientRect(),
      // buy-now heads straight to checkout — no need to flash the cart
      // drawer open behind it
      openCart: !thenCheckout,
    });
    return true;
  };

  const handleAdd = () => {
    if (doAdd() && !inCart) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
  };

  const handleBuy = () => {
    if (doAdd(true)) router.push("/checkout");
  };

  return (
    <div className="bg-shell">
      <nav className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-1.5 px-5 py-3 text-xs text-ink-3 lg:px-8">
        <Link href="/" className="hover:text-flame">
          Home
        </Link>
        <CaretRight size={11} />
        <Link href="/shop" className="hover:text-flame">
          Shop
        </Link>
        {p.categoryName && (
          <>
            <CaretRight size={11} />
            <Link
              href={`/shop?category=${p.category}`}
              className="hover:text-flame"
            >
              {p.categoryName}
            </Link>
          </>
        )}
        <CaretRight size={11} />
        <span className="font-semibold text-ink">{p.name}</span>
      </nav>

      <div className="mx-auto max-w-[1500px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,660px)] lg:items-start">
        {/* ══ LEFT — gallery ══ */}
        <div className="lg:sticky lg:top-[99px] lg:pl-8">
          <div className="flex flex-col-reverse gap-3 px-5 py-8 lg:flex-row lg:px-0">
            {/* thumbnails — below the main image on mobile, left of it on desktop */}
            {slides.length > 1 && (
              <div className="flex flex-row flex-wrap gap-2 lg:flex-col lg:flex-nowrap">
                {slides.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    aria-label={
                      s.kind === "video"
                        ? `Play video ${i + 1}`
                        : `View image ${i + 1}`
                    }
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-canvas transition-colors ${
                      i === activeSlide
                        ? "border-flame"
                        : "border-line hover:border-ink-5"
                    }`}
                  >
                    <ProductImage
                      src={s.kind === "video" ? s.poster || p.image : s.url}
                      alt=""
                      sizes="64px"
                      overlay
                    />
                    {s.kind === "video" && (
                      <span className="absolute inset-0 grid place-items-center bg-black/25">
                        <Play
                          size={16}
                          weight="fill"
                          className="text-white drop-shadow"
                        />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 lg:mx-auto lg:max-w-105">
              <div
                ref={art}
                onMouseEnter={() => canZoom && setZoomHover(true)}
                onMouseLeave={() => setZoomHover(false)}
                onMouseMove={canZoom ? updateZoomPos : undefined}
                onClick={(e) => {
                  if (!canZoom) return;
                  updateZoomPos(e);
                  setZoomPinned((p) => !p);
                }}
                className={`relative aspect-square w-full overflow-hidden rounded-3xl bg-canvas ${
                  canZoom ? (zoomPinned ? "cursor-zoom-out" : "cursor-zoom-in") : ""
                }`}
              >
                {/* every image slide is mounted and loaded up front, stacked;
                    a thumbnail click only flips which one is visible, so the
                    switch is instant instead of waiting on a fresh download */}
                {slides.some((s) => s.kind !== "video") ? (
                  slides.map((s, i) =>
                    s.kind === "video" ? null : (
                      <div
                        key={i}
                        aria-hidden={i !== activeSlide}
                        style={
                          i === activeSlide && zoomOn
                            ? {
                                transform: `scale(${zoomScale})`,
                                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                                transition: "transform 180ms ease-out",
                              }
                            : {
                                transform: "scale(1)",
                                transformOrigin: "50% 50%",
                                transition: "transform 220ms ease-out",
                              }
                        }
                        className={`absolute inset-0 transition-opacity duration-150 ${
                          i === activeSlide ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <ProductImage
                          src={s.url}
                          alt={i === activeSlide ? p.name : ""}
                          sizes="(max-width: 1024px) 100vw, 420px"
                          priority={i === 0}
                          overlay
                        />
                      </div>
                    )
                  )
                ) : (
                  active?.kind !== "video" && (
                    <div
                      style={
                        zoomOn
                          ? {
                              transform: `scale(${zoomScale})`,
                              transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                              transition: "transform 180ms ease-out",
                            }
                          : {
                              transform: "scale(1)",
                              transformOrigin: "50% 50%",
                              transition: "transform 220ms ease-out",
                            }
                      }
                      className="absolute inset-0"
                    >
                      <ProductImage
                        src={p.image}
                        alt={p.name}
                        sizes="(max-width: 1024px) 100vw, 420px"
                        priority
                        overlay
                      />
                    </div>
                  )
                )}
                {active?.kind === "video" && (
                  <video
                    key={active.url}
                    src={active.url}
                    poster={active.poster || undefined}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={active.alt || `${p.name} video`}
                    className="absolute inset-0 z-1 h-full w-full bg-black object-contain"
                  />
                )}
                {canZoom && (
                  <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/60 p-1 backdrop-blur">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomStep((s) => Math.max(0, s - 1));
                      }}
                      disabled={zoomStep === 0}
                      aria-label="Zoom out"
                      className="grid h-7 w-7 place-items-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-40"
                    >
                      <MagnifyingGlassMinus size={14} weight="bold" />
                    </button>
                    <span className="min-w-[34px] text-center text-[11px] font-bold text-white">
                      {zoomScale}×
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomStep((s) => Math.min(ZOOM_LEVELS.length - 1, s + 1));
                      }}
                      disabled={zoomStep === ZOOM_LEVELS.length - 1}
                      aria-label="Zoom in"
                      className="grid h-7 w-7 place-items-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-40"
                    >
                      <MagnifyingGlassPlus size={14} weight="bold" />
                    </button>
                  </div>
                )}
                <div
                  className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2"
                  hidden={active?.kind === "video"}
                >
                  {off > 0 && (
                    <span className="rounded-full bg-leaf px-3 py-1.5 text-xs font-extrabold text-white">
                      {off}% off
                    </span>
                  )}
                  {p.isCustomisable && (
                    <span className="rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                      Customisable
                    </span>
                  )}
                </div>
                <span
                  className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold text-ink backdrop-blur-sm"
                  hidden={active?.kind === "video"}
                >
                  <Cube size={13} weight="bold" />
                  Printed to order
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT — configurator ══ */}
        <div className="px-5 pb-16 pt-2 lg:px-10 lg:pb-24 lg:pt-10">
          {p.categoryName && (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-flame">
              {p.categoryName}
            </p>
          )}
          <h1 className="mt-2 font-display text-[clamp(1.9rem,3.4vw,2.9rem)] font-extrabold leading-[1.03] tracking-[-0.03em] text-ink">
            {p.name}
          </h1>
          {p.blurb && (
            <p className="mt-3 text-base leading-relaxed text-ink-2">{p.blurb}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-ink-3">
            {p.sku && <span>SKU {p.sku}</span>}
            {p.leadTimeDays != null && (
              <>
                <span className="h-3.5 w-px bg-line" />
                <span className="text-leaf">
                  {p.leadTimeDays === 0
                    ? "Dispatches in 48h"
                    : `Made in ${p.leadTimeDays} days`}
                </span>
              </>
            )}
          </div>

          {/* ── Price ── */}
          <div className="mt-7 flex flex-wrap items-baseline gap-3 border-t border-line pt-7">
            <span className="font-display text-[2.75rem] font-extrabold leading-none text-ink">
              {formatINR(unit)}
            </span>
            {off > 0 && (
              <span className="text-lg text-ink-4 line-through">
                {formatINR(p.compareAt)}
              </span>
            )}
            <span className="w-full text-xs text-ink-3">
              per unit
              {p.taxRate ? ` · +${p.taxRate}% tax` : " · inclusive of taxes"}
            </span>
            {tiered && (
              <span className="w-full text-xs font-semibold text-ink-3">
                Base price {formatINR(p.price)} · bulk rate shown for {qty}{" "}
                unit{qty === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* ── Options — fully dynamic from the backend ── */}
          <span ref={optionsRef} className="block scroll-mt-28" />
          {(p.options || []).map((opt, i) => (
            <Section
              key={opt.id || opt.name}
              n={String(i + 1).padStart(2, "0")}
              title={
                <>
                  {opt.name}
                  <span className="ml-1.5 text-xs font-bold text-flame">*</span>
                </>
              }
              value={selected[opt.name] || "Choose one"}
            >
              <div className="flex flex-wrap gap-2.5">
                {(opt.values || []).map((v) => {
                  const on = selected[opt.name] === v.value;
                  return (
                    <button
                      key={v.id || v.value}
                      onClick={() => {
                        setSelected((s) => ({ ...s, [opt.name]: v.value }));
                        setOptError("");
                      }}
                      aria-pressed={on}
                      className={`group flex items-center gap-2.5 rounded-full border-2 py-1.5 pr-4 transition-all ${
                        opt.type === "COLOR" ? "pl-1.5" : "pl-4"
                      } ${
                        on
                          ? "border-ink bg-ink text-white"
                          : "border-line text-ink-2 hover:border-ink-5"
                      }`}
                    >
                      {opt.type === "COLOR" && (
                        <span
                          className="h-7 w-7 rounded-full ring-1 ring-inset ring-black/10"
                          style={{ backgroundColor: colorHex(v.value) }}
                        />
                      )}
                      <span className="text-sm font-bold">{v.value}</span>
                      {v.priceDelta > 0 && (
                        <span className="text-xs font-semibold opacity-70">
                          +{formatINR(v.priceDelta)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>
          ))}

          {/* ── Filament → Family → Color picker ── */}
          {hasFilaments && (
            <>
              {/* Step 1: base filament (PLA, PETG, ABS…) */}
              <Section
                n={String((p.options?.length || 0) + 1).padStart(2, "0")}
                title={
                  <>
                    Filament
                    <span className="ml-1.5 text-xs font-bold text-flame">*</span>
                  </>
                }
                value={selectedBaseType || "Choose one"}
              >
                <div className="flex flex-wrap gap-2.5">
                  {baseTypes.map((type) => {
                    const on = selectedBaseType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setSelectedBaseType(type);
                          setSelectedFamilyKey("");
                          setSelectedColorId("");
                          setOptError("");
                        }}
                        aria-pressed={on}
                        className={`rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all ${
                          on
                            ? "border-ink bg-ink text-white"
                            : "border-line text-ink-2 hover:border-ink-5"
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Step 2: color family — only after a base is picked */}
              {selectedBaseType && (
                <Section
                  n={String((p.options?.length || 0) + 2).padStart(2, "0")}
                  title={
                    <>
                      Color family
                      <span className="ml-1.5 text-xs font-bold text-flame">*</span>
                    </>
                  }
                  value={selectedFamily?.name || "Choose one"}
                >
                  <div className="flex flex-wrap gap-2.5">
                    {familiesInBase.map((fam) => {
                      const on = selectedFamilyKey === fam.key;
                      return (
                        <button
                          key={fam.key}
                          onClick={() => {
                            setSelectedFamilyKey(fam.key);
                            setSelectedColorId("");
                            setOptError("");
                          }}
                          aria-pressed={on}
                          className={`rounded-xl border-2 px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-all ${
                            on
                              ? "border-ink bg-ink text-white"
                              : "border-line text-ink-2 hover:border-ink-5"
                          }`}
                        >
                          {fam.name}
                        </button>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Step 3: color — only after a family is picked */}
              {selectedBaseType && selectedFamilyKey && (
                <Section
                  n={String((p.options?.length || 0) + 3).padStart(2, "0")}
                  title={
                    <>
                      Color
                      <span className="ml-1.5 text-xs font-bold text-flame">*</span>
                    </>
                  }
                  value={selectedColor ? selectedColor.name : "Choose one"}
                >
                  {colorsInFamily.length === 0 ? (
                    <p className="text-sm text-ink-3">
                      No colors in this family yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {colorsInFamily.map((c) => {
                        const on = selectedColorId === c.id;
                        const oos = c.stock <= 0;
                        return (
                          <button
                            key={`${c.filamentId}-${c.id}`}
                            onClick={() => {
                              if (oos) return;
                              setSelectedColorId(c.id);
                              setOptError("");
                            }}
                            disabled={oos}
                            aria-pressed={on}
                            title={
                              oos
                                ? `${c.name} — Out of stock`
                                : `${c.name}${c.finish ? ` · ${c.finish}` : ""} · Stock: ${c.stock}`
                            }
                            className={`group flex items-center gap-2.5 rounded-full border-2 py-1.5 pl-1.5 pr-4 transition-all ${
                              oos
                                ? "cursor-not-allowed border-line opacity-40"
                                : on
                                  ? "border-ink bg-ink text-white"
                                  : "border-line text-ink-2 hover:border-ink-5"
                            }`}
                          >
                            <SilkSwatch color={c} />
                            <span className="flex flex-col items-start leading-tight">
                              <span className="text-sm font-bold">
                                {c.name}
                              </span>
                              {c.finish && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                                  {c.finish}
                                </span>
                              )}
                            </span>
                            {oos && (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-flame">
                                Out of stock
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Section>
              )}
            </>
          )}

          {/* ── Quantity + tiers ── */}
          <Section
            n={String(
              (p.options?.length || 0) + (hasFilaments ? 4 : 1)
            ).padStart(2, "0")}
            title="How many?"
            value={`${qty} unit${qty > 1 ? "s" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center rounded-xl border-2 border-line">
                <button
                  onClick={() => setQty((n) => Math.max(p.minQty || 1, n - 1))}
                  aria-label="Decrease quantity"
                  className="grid h-12 w-12 place-items-center text-ink-2 transition-colors hover:bg-canvas"
                >
                  <Minus size={16} weight="bold" />
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) =>
                    setQty(
                      Math.max(
                        p.minQty || 1,
                        Math.min(99999, Number(e.target.value) || 1)
                      )
                    )
                  }
                  aria-label="Quantity"
                  className="no-spin h-12 w-20 border-x-2 border-line text-center font-display text-lg font-extrabold text-ink outline-none"
                />
                <button
                  onClick={() => setQty((n) => Math.min(99999, n + 1))}
                  aria-label="Increase quantity"
                  className="grid h-12 w-12 place-items-center text-ink-2 transition-colors hover:bg-canvas"
                >
                  <Plus size={16} weight="bold" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[25, 50, 75].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQty(n)}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                      qty === n
                        ? "border-neon bg-neon/10 text-neon"
                        : "border-line text-ink-2 hover:border-flame hover:text-flame"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                {tiers.slice(1).map((t) => (
                  <button
                    key={t.minQty}
                    onClick={() => setQty(t.minQty)}
                    className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink-2 transition-colors hover:border-flame hover:text-flame"
                  >
                    {t.minQty}
                  </button>
                ))}
              </div>
            </div>

            {tiers.length > 1 && (
              <TierMeter
                tiers={tiers}
                tierIndex={tierIndex}
                nextTier={nextTier}
                qty={qty}
                unit={unit}
              />
            )}
          </Section>

          {optError && (
            <p className="mt-4 rounded-lg bg-flame-lt px-3 py-2 text-sm font-bold text-flame">
              {optError}
            </p>
          )}

          {/* ── Bulk-order nudge ── */}
          {qty >= BULK_THRESHOLD && (
            <div className="mt-8 rounded-2xl border-2 border-neon bg-neon/10 p-5">
              <div className="flex items-start gap-3">
                <Stack
                  size={22}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-neon"
                />
                <div>
                  <p className="font-display text-base font-extrabold text-ink">
                    Ordering {qty} or more?
                  </p>
                  <p className="mt-1 text-sm text-ink-2">
                    Get a bulk quote — slab pricing on {p.name}, a GST invoice,
                    negotiated freight and a lead time confirmed by the desk.
                  </p>
                </div>
              </div>
              <Link
                href={`/bulk?product=${p.slug || p.id}&qty=${qty}${bulkOptsParam}`}
                onClick={guardBulk}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
              >
                Start bulk order
                <ArrowRight size={15} weight="bold" />
              </Link>
            </div>
          )}

          {/* ── Total + actions ── */}
          <div className="mt-9 rounded-2xl border-2 border-ink bg-ink p-5 text-white">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                  Order total
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold">
                  {formatINR(lineTotal)}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {qty} × {formatINR(unit)}
                  {tiered && (
                    <span className="ml-2 font-bold text-gold">bulk rate</span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={handleAdd}
                className="flex items-center justify-center gap-2 rounded-xl bg-gold py-4 text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-gold-dk"
              >
                {added ? (
                  <>
                    <Check size={17} weight="bold" />
                    Added
                  </>
                ) : inCart ? (
                  <>
                    <Check size={17} weight="bold" />
                    Already added
                  </>
                ) : (
                  <>
                    <ShoppingCart size={17} />
                    Add to cart
                  </>
                )}
              </button>
              <button
                onClick={handleBuy}
                className="flex items-center justify-center gap-2 rounded-xl bg-flame py-4 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
              >
                <Lightning size={17} weight="fill" />
                Buy now
              </button>
            </div>
          </div>

          {/* ── Trust badges ── */}
          <div className="mt-6 rounded-2xl border border-line p-5">
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Lightning, label: "48h dispatch" },
                { icon: ShieldCheck, label: "Secure payment" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 text-center"
                >
                  <Icon size={17} className="text-ink-3" />
                  <span className="text-[11px] font-semibold text-ink-3">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── About ── */}
          {p.description && (
            <div className="mt-12 border-t border-line pt-9">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
                About this object
              </h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">
                {p.description}
              </p>
            </div>
          )}

          {/* ── Specs ── */}
          {Object.keys(p.specs || {}).length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
                Print specification
              </h2>
              <dl className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
                {Object.entries(p.specs).map(([k, v]) => (
                  <div key={k} className="bg-shell px-4 py-3.5">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-4">
                      {k}
                    </dt>
                    <dd className="mt-1 text-sm font-bold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* ── Bulk ── */}
          {(p.bulkTiers || []).length > 0 && (
            <div className="mt-10 rounded-2xl bg-canvas p-6">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
                Buying for a business?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                The price drops with volume — tiers apply automatically in the
                cart, no code needed.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {tiers.map((t, i) => (
                  <button
                    key={t.minQty}
                    onClick={() => setQty(t.minQty)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      i === tierIndex
                        ? "border-flame bg-flame-lt"
                        : "border-transparent bg-shell hover:border-ink-5"
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-4">
                      {i === tiers.length - 1
                        ? `${t.minQty}+`
                        : `${t.minQty} – ${tiers[i + 1].minQty - 1}`}
                    </p>
                    <p className="mt-0.5 font-display text-base font-extrabold text-ink">
                      {formatINR(t.price)}
                    </p>
                  </button>
                ))}
              </div>
              <Link
                href={`/bulk?product=${p.slug || p.id}&qty=${Math.max(
                  qty,
                  BULK_THRESHOLD
                )}${bulkOptsParam}`}
                onClick={guardBulk}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-flame px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk"
              >
                Get a bulk quote
                <CaretRight size={14} weight="bold" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TierMeter({ tiers, tierIndex, nextTier, qty, unit }) {
  const fill = useRef(null);

  const pct = useMemo(() => {
    const slice = 100 / tiers.length;
    const base = tierIndex * slice;
    if (!nextTier) return 100;
    const from = tiers[tierIndex].minQty;
    const span = nextTier.minQty - from;
    return base + Math.min(1, (qty - from) / span) * slice;
  }, [tiers, tierIndex, nextTier, qty]);

  useGSAP(
    () => {
      gsap.to(fill.current, {
        width: `${pct}%`,
        duration: prefersReducedMotion() ? 0 : 0.5,
        ease: "expo.out",
      });
    },
    { dependencies: [pct] }
  );

  return (
    <div className="mt-6 rounded-2xl border border-line p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-ink">
          {tierIndex === 0 ? "Retail price" : `Bulk tier ${tierIndex}`} —{" "}
          <span className="text-flame">{formatINR(unit)}/unit</span>
        </p>
        {nextTier ? (
          <p className="text-xs font-semibold text-ink-3">
            {nextTier.minQty - qty} more → {formatINR(nextTier.price)}
          </p>
        ) : (
          <p className="text-xs font-bold text-leaf">Best rate unlocked</p>
        )}
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-canvas">
        <div
          ref={fill}
          className="h-full rounded-full bg-gradient-to-r from-gold to-flame"
          style={{ width: "0%" }}
        />
      </div>

      <div className="mt-3 flex justify-between">
        {tiers.map((t, i) => (
          <div
            key={t.minQty}
            className={`text-center ${
              i === tierIndex ? "text-flame" : "text-ink-4"
            }`}
          >
            <p className="text-[11px] font-extrabold">
              {t.minQty}
              {i === tiers.length - 1 ? "+" : ""}
            </p>
            <p className="text-[10px] font-semibold">{formatINR(t.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SilkSwatch({ color }) {
  const stops = [color.hex, color.hexSecondary, color.hexTertiary].filter(Boolean);
  if (stops.length <= 1) {
    return (
      <span
        className="h-7 w-7 rounded-full ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: stops[0] || "#eee" }}
      />
    );
  }
  const slice = 100 / stops.length;
  const bg = stops
    .map((hex, i) => `${hex} ${i * slice}% ${(i + 1) * slice}%`)
    .join(", ");
  return (
    <span
      className="h-7 w-7 rounded-full ring-1 ring-inset ring-black/10"
      style={{ background: `linear-gradient(90deg, ${bg})` }}
    />
  );
}

function Section({ n, title, value, children }) {
  return (
    <section className="mt-9 border-t border-line pt-7">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-display text-xs font-extrabold text-flame">{n}</span>
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
          {title}
        </h2>
        {value && (
          <span className="ml-auto truncate text-sm font-semibold text-ink-3">
            {value}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
