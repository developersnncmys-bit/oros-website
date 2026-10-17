/**
 * The backend product shape is thin — basePrice, shortDescription, a
 * populated category, media in its own collection. The storefront
 * components want a flatter object with an `image`, a `price`, `bulkTiers`
 * and ready-to-render `options`. Everything funnels through here so a
 * backend field rename is a one-line fix.
 */

export const PLACEHOLDER_IMAGE = "/placeholder.svg";

const idOf = (ref) =>
  ref && typeof ref === "object" ? ref._id || ref.id || null : ref || null;

const slugOf = (ref) =>
  ref && typeof ref === "object" ? ref.slug || null : null;

const nameOf = (ref) =>
  ref && typeof ref === "object" ? ref.name || null : null;

/** media[] | primaryMedia -> a single best image url */
function pickImage(raw) {
  if (raw.primaryMedia?.url) return raw.primaryMedia.url;
  const media = Array.isArray(raw.media) ? raw.media : [];
  const images = media.filter((m) => m.type !== "VIDEO");
  const primary = images.find((m) => m.isPrimary);
  return primary?.url || images[0]?.url || raw.image || PLACEHOLDER_IMAGE;
}

function pickGallery(raw) {
  const media = Array.isArray(raw.media) ? raw.media : [];
  const urls = media
    .filter((m) => m.type !== "VIDEO" && m.url)
    .map((m) => m.url);
  if (urls.length) return urls;
  const one = pickImage(raw);
  return [one];
}

/** media[] -> the product videos, in sort order, with a poster frame */
function pickVideos(raw) {
  const media = Array.isArray(raw.media) ? raw.media : [];
  return media
    .filter((m) => m.type === "VIDEO" && m.url)
    .map((m) => ({
      url: m.url,
      poster: m.posterUrl || "",
      alt: m.altText || "",
    }));
}

/** priceSlabs[] -> the { minQty, price } tiers the PDP + cart walk */
function toBulkTiers(priceSlabs) {
  if (!Array.isArray(priceSlabs)) return [];
  return priceSlabs
    .map((s) => ({
      minQty: Number(s.minQty) || 0,
      maxQty: s.maxQty != null ? Number(s.maxQty) : null,
      price: Number(s.unitPrice) || 0,
    }))
    .filter((t) => t.minQty > 0 && t.price > 0)
    .sort((a, b) => a.minQty - b.minQty);
}

/** options[] (with values[]) -> normalised, ready to render on the PDP */
function toOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((o) => ({
    id: o._id || o.id,
    name: o.name,
    type: o.type || "SELECT",
    isRequired: !!o.isRequired,
    values: (o.values || []).map((v) => ({
      id: v._id || v.id,
      value: v.value,
      priceDelta: Number(v.priceDelta) || 0,
      priceMultiplier: v.priceMultiplier != null ? Number(v.priceMultiplier) : 1,
    })),
  }));
}

/** specs[] -> a plain { label: value } map for the spec table */
function toSpecs(specs) {
  if (!Array.isArray(specs)) return {};
  return specs.reduce((acc, s) => {
    if (s?.label) acc[s.label] = s.value;
    return acc;
  }, {});
}

export function normalizeProduct(raw, extra = {}) {
  if (!raw) return null;

  const product = raw.product || raw; // getProduct() nests under .product
  const specs = raw.specs ?? extra.specs;
  const media = raw.media ?? extra.media;
  const options = raw.options ?? extra.options;
  const priceSlabs = raw.priceSlabs ?? extra.priceSlabs;

  const source = { ...product };
  if (media) source.media = media;

  const normOptions = toOptions(options);
  const colourOption = normOptions.find((o) => o.type === "COLOR");

  return {
    id: idOf(product) || product._id,
    _id: idOf(product) || product._id,
    sku: product.sku || "",
    slug: product.slug || idOf(product),
    name: product.name || "Untitled",

    blurb: product.shortDescription || "",
    description: product.longDescription || product.shortDescription || "",

    price: Number(product.basePrice) || 0,
    compareAt: product.compareAt != null ? Number(product.compareAt) : null,
    taxRate: Number(product.taxRate) || 0,
    leadTimeDays: product.leadTimeDays ?? null,
    minQty: Number(product.minQty) || 1,
    isCustomisable: !!product.isCustomisable,
    status: product.status || "PUBLISHED",

    category: slugOf(product.category) || idOf(product.category) || "",
    categoryId: idOf(product.category),
    categoryName: nameOf(product.category) || "",
    subcategory: slugOf(product.subcategory) || idOf(product.subcategory) || "",
    subcategoryId: idOf(product.subcategory),
    subcategoryName: nameOf(product.subcategory) || "",

    image: pickImage(source),
    images: pickGallery(source),
    videos: pickVideos(source),

    bulkTiers: toBulkTiers(priceSlabs),
    options: normOptions,
    specs: toSpecs(specs),

    // list payloads now ship options too, so the grid card can offer the
    // variant picker inline before "add to cart"
    hasOptions: normOptions.length > 0,

    // derived, best-effort — never assumed present by the UI
    colors: colourOption ? colourOption.values.map((v) => v.value) : [],

    totalSold: raw.totalSold ?? product.totalSold ?? null,
    createdAt: product.createdAt || null,
  };
}

export function normalizeProductList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((p) => normalizeProduct(p)).filter(Boolean);
}

export function normalizeCategory(raw) {
  if (!raw) return null;
  return {
    id: raw._id || raw.id,
    _id: raw._id || raw.id,
    name: raw.name || "",
    slug: raw.slug || raw._id,
    description: raw.description || "",
    tagline: raw.seoDescription || raw.description || "",
    image: raw.image || PLACEHOLDER_IMAGE,
    isActive: raw.isActive !== false,
  };
}

export function normalizeCategoryList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeCategory).filter(Boolean);
}

export function normalizeSubcategory(raw) {
  if (!raw) return null;
  return {
    id: raw._id || raw.id,
    _id: raw._id || raw.id,
    name: raw.name || "",
    slug: raw.slug || raw._id,
    categoryId:
      raw.category && typeof raw.category === "object"
        ? raw.category._id
        : raw.category || null,
    description: raw.description || "",
    image: raw.image || PLACEHOLDER_IMAGE,
    isActive: raw.isActive !== false,
  };
}

export function normalizeSubcategoryList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeSubcategory).filter(Boolean);
}

export function normalizeBanner(raw) {
  if (!raw) return null;
  // Title is two admin-authored parts, each with its own colour: `title1`
  // renders first, `title2` after it. Older docs only had a single `title`.
  const title1 = raw.title1 || raw.title || "";
  const title2 = raw.title2 || "";
  return {
    id: raw._id || raw.id,
    type: raw.type,
    kicker: raw.kicker || "",
    title1,
    title1Color: raw.title1Color || "#2b1b4d",
    title2,
    title2Color: raw.title2Color || "#ff5a2c",
    title: [title1, title2].filter(Boolean).join(" "), // plain text, for alt/aria
    subTitle: raw.subTitle || "",
    subTitleColor: raw.subTitleColor || "",
    imageDesktop: raw.mediaUrlDesktop || PLACEHOLDER_IMAGE,
    imageMobile: raw.mediaUrlMobile || raw.mediaUrlDesktop || PLACEHOLDER_IMAGE,
    ctaLabel: raw.ctaLabel || "",
    ctaUrl: raw.ctaUrl || "",
    tone: raw.tone === "DARK" ? "dark" : "light",
    order: Number(raw.order) || 0,
  };
}

export function normalizeBannerList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeBanner).filter(Boolean);
}
