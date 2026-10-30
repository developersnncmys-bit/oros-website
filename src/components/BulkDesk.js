"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialog";
import { CaretRight, Plus, Trash } from "@phosphor-icons/react";
import { fetchProducts, fetchProductBySlug } from "@/lib/catalog";
import { createQuotation, listQuotations } from "@/api/quotation.api";
import { listAddresses } from "@/api/address.api";
import { useAuthStore } from "@/store/authStore";
import QuotationThread from "@/components/QuotationThread";
import SilkSwatch from "@/components/SilkSwatch";
import { scrollToTop } from "@/lib/scrollTop";
import { colorHex } from "@/lib/format";

// the quotation upload middleware only accepts 3D model files — keep this
// list in sync with ALLOWED_3D_FORMATS in the backend upload middleware
const MODEL_FORMATS = [".stl", ".obj", ".step", ".stp", ".3mf", ".iges", ".igs"];
const MODEL_ACCEPT = MODEL_FORMATS.join(",");
const MODEL_MAX_MB = 100;
const isModelFile = (name = "") =>
  MODEL_FORMATS.includes(name.toLowerCase().slice(name.lastIndexOf(".")));

// wraps a required input/select and drops a red asterisk in the corner —
// these fields have no visible label, only a placeholder, so this is the
// only way to flag "required" without redesigning the whole form
function RequiredField({ children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-flame"
      >
        *
      </span>
    </div>
  );
}

// PDP-style three-tier filament picker: base type → color family → color.
// State lives on the parent line (`baseType`, `familyKey`, `colorId`) and
// cascades: changing the base clears family + color, changing the family
// clears the color — same contract the PDP enforces.
const BASE_ORDER = ["PLA", "PETG", "ABS", "ASA"];

function FilamentPicker({ product, line, onChange }) {
  const filamentsList = product.filaments || [];

  const baseTypes = useMemo(() => {
    const unique = [
      ...new Set(filamentsList.map((f) => f.type).filter(Boolean)),
    ];
    return unique.sort((a, b) => {
      const ai = BASE_ORDER.indexOf(a);
      const bi = BASE_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [filamentsList]);

  const filamentsInBase = useMemo(
    () => filamentsList.filter((f) => f.type === line.baseType),
    [filamentsList, line.baseType]
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

  const colorsInFamily = useMemo(() => {
    if (!line.baseType || !line.familyKey) return [];
    const list = [];
    filamentsInBase
      .filter((f) => (f.colorFamily?.id || "__none__") === line.familyKey)
      .forEach((f) => {
        (f.colors || []).forEach((c) => {
          list.push({ ...c, filamentName: f.name });
        });
      });
    return list;
  }, [filamentsInBase, line.baseType, line.familyKey]);

  const selectedFamilyName = familiesInBase.find(
    (f) => f.key === line.familyKey
  )?.name;
  const selectedColorName = colorsInFamily.find(
    (c) => c.id === line.colorId
  )?.name;

  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
          Filament<span className="text-flame"> *</span>
          <span className="ml-2 normal-case font-semibold tracking-normal text-ink-2">
            {line.baseType || "Choose one"}
          </span>
        </span>
        <div className="flex flex-wrap gap-2">
          {baseTypes.map((type) => {
            const on = line.baseType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() =>
                  onChange(
                    on
                      ? { baseType: "", familyKey: "", colorId: "" }
                      : { baseType: type, familyKey: "", colorId: "" }
                  )
                }
                aria-pressed={on}
                className={`rounded-full border-2 px-3.5 py-1 text-sm font-bold transition-all ${
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
      </div>

      {line.baseType && familiesInBase.length > 0 && (
        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
            Color family<span className="text-flame"> *</span>
            <span className="ml-2 normal-case font-semibold tracking-normal text-ink-2">
              {selectedFamilyName || "Choose one"}
            </span>
          </span>
          <div className="flex flex-wrap gap-2">
            {familiesInBase.map((fam) => {
              const on = line.familyKey === fam.key;
              return (
                <button
                  key={fam.key}
                  type="button"
                  onClick={() =>
                    onChange(
                      on
                        ? { familyKey: "", colorId: "" }
                        : { familyKey: fam.key, colorId: "" }
                    )
                  }
                  aria-pressed={on}
                  className={`rounded-full border-2 px-3.5 py-1 text-sm font-bold transition-all ${
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
        </div>
      )}

      {line.baseType && line.familyKey && colorsInFamily.length > 0 && (
        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
            Color<span className="text-flame"> *</span>
            <span className="ml-2 normal-case font-semibold tracking-normal text-ink-2">
              {selectedColorName || "Choose one"}
            </span>
          </span>
          <div className="flex flex-wrap gap-2">
            {colorsInFamily.map((c) => {
              const on = line.colorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChange({ colorId: on ? "" : c.id })}
                  aria-pressed={on}
                  className={`flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3.5 transition-all ${
                    on
                      ? "border-ink bg-ink text-white"
                      : "border-line text-ink-2 hover:border-ink-5"
                  }`}
                >
                  <SilkSwatch color={c} className="h-6 w-6" />
                  <span className="text-sm font-bold">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BulkDesk() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { confirm: confirmLeave, ConfirmDialog } = useConfirm();
  // /custom is a dedicated custom-quote route; /bulk?custom keeps working too
  const isCustom = pathname === "/custom" || params.has("custom");
  const productParam = params.get("product");
  const qtyParam = Number(params.get("qty")) || 0;
  // the variant picked on the PDP, as { optionName: value }
  const optionsParam = useMemo(() => {
    try {
      const o = JSON.parse(params.get("options") || "{}");
      return o && typeof o === "object" ? o : {};
    } catch {
      return {};
    }
  }, [params]);
  const token = useAuthStore((s) => s.token);

  const [products, setProducts] = useState([]);
  // bulk quotes can carry several products — one row per product variant;
  // options is { optionName: value }. baseType/familyKey/colorId drive the
  // three-tier filament picker, same shape as the PDP.
  const [lines, setLinesRaw] = useState([
    {
      productId: "",
      qty: qtyParam > 0 ? qtyParam : 250,
      options: {},
      baseType: "",
      familyKey: "",
      colorId: "",
    },
  ]);
  // any edit by the customer marks the rows as unsent work worth guarding
  const [touched, setTouched] = useState(false);
  const setLines = (update) => {
    setTouched(true);
    setLinesRaw(update);
  };
  const setLine = (i, patch) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const setLineOption = (i, name, value) =>
    setLines((ls) =>
      ls.map((l, j) =>
        j === i ? { ...l, options: { ...l.options, [name]: value } } : l
      )
    );
  const removeLine = (i) => setLines((ls) => ls.filter((_, j) => j !== i));
  // a new row starts empty — the customer picks the product themselves
  const addLine = () =>
    setLines((ls) => [
      ...ls,
      {
        productId: "",
        qty: 250,
        options: {},
        baseType: "",
        familyKey: "",
        colorId: "",
      },
    ]);
  // another variant of the same product, right below its row
  const addVariant = (i) =>
    setLines((ls) => [
      ...ls.slice(0, i + 1),
      {
        productId: ls[i].productId,
        qty: 250,
        options: {},
        baseType: "",
        familyKey: "",
        colorId: "",
      },
      ...ls.slice(i + 1),
    ]);
  // filament picks cascade — changing base type clears family + color,
  // and changing family clears color. The patch is merged into the line.
  const setLineFilament = (i, patch) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  // custom quotes: catalogue products the request is based on, each once
  const [refs, setRefsRaw] = useState([{ productId: "", qty: 1 }]);
  const setRefs = (update) => {
    setTouched(true);
    setRefsRaw(update);
  };
  const setRef = (i, patch) =>
    setRefs((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const removeRef = (i) => setRefs((rs) => rs.filter((_, j) => j !== i));
  const addRef = () => setRefs((rs) => [...rs, { productId: "", qty: 1 }]);
  const [created, setCreated] = useState(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [files, setFiles] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  // every field the quotation model / createQuotationService accepts
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    taxRegNo: "",
    requirements: "",
    deadline: "",
    variantDetails: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
  });

  const productMap = useMemo(
    () => new Map(products.map((p) => [String(p.id), p])),
    [products]
  );

  // The /product list endpoint strips `filaments` to keep the response
  // small, so a list product has no filament data to render the picker
  // against. We lazily upgrade any selected row to the full PDP payload
  // (same source the PDP uses) and merge it over the list product.
  const [fullProductMap, setFullProductMap] = useState({});
  const fetchingFullRef = useRef(new Set());
  useEffect(() => {
    const ids = [
      ...new Set(lines.map((l) => String(l.productId)).filter(Boolean)),
    ];
    for (const id of ids) {
      if (fullProductMap[id] || fetchingFullRef.current.has(id)) continue;
      fetchingFullRef.current.add(id);
      fetchProductBySlug(id)
        .then((full) => {
          if (full) setFullProductMap((m) => ({ ...m, [id]: full }));
        })
        .catch(() => {})
        .finally(() => fetchingFullRef.current.delete(id));
    }
  }, [lines, fullProductMap]);

  // Prefer the full payload (has filaments) but fall back to the list
  // record so dropdown + image render immediately before the fetch lands.
  const resolveProduct = (id) =>
    fullProductMap[String(id)] || productMap.get(String(id)) || null;

  /*
  Nothing here is saved until the request is sent, so warn before the
  customer walks away from products they've added (arriving from a PDP
  counts — that product was added for them).
  */
  const dirty =
    !created &&
    (touched ||
      !!productParam ||
      files.length > 0 ||
      Object.entries(form).some(
        ([k, v]) =>
          k !== "country" && String(v).trim() !== ""
      ));

  useEffect(() => {
    if (!dirty) return;
    const LEAVE_MSG =
      "You haven't sent this quotation yet. If you leave this page, all the products you added will be lost and you'll have to add them again.";

    // reload / close tab / typed URL — browsers only show their own text
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    // in-app links: runs in the capture phase, before Next's <Link> handler
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      // same-page anchors (e.g. #enquiry) don't leave the page
      if (
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;
      // hold the navigation and ask in the site's own popup
      e.preventDefault();
      e.stopPropagation();
      confirmLeave(LEAVE_MSG, "Leave page").then((leave) => {
        if (!leave) return;
        if (url.origin === window.location.origin)
          router.push(url.pathname + url.search + url.hash);
        else window.location.href = url.href;
      });
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, confirmLeave, router]);

  const reloadCreated = async () => {
    const data = await listQuotations({ limit: 50 });
    const fresh = (data?.quotation || []).find(
      (x) => String(x._id) === String(created?._id)
    );
    if (fresh) setCreated(fresh);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const useMyAddress = async () => {
    setAddrLoading(true);
    setErr("");
    try {
      // Pick the default address, or fall back to the most-recently updated
      // one — matches the behaviour of the shared `findResolvedAddress`
      // helper on the backend.
      const { addresses } = await listAddresses();
      const list = Array.isArray(addresses) ? addresses : [];
      const address = list.find((a) => a.isDefault) || list[0];
      if (!address) {
        setErr("No saved address found on your account");
        return;
      }
      setForm((f) => ({
        ...f,
        name: f.name || address.name || "",
        phone: f.phone || address.phone || "",
        addressLine1: address.addressLine1 || "",
        addressLine2: address.addressLine2 || "",
        city: address.city || "",
        state: address.state || "",
        country: address.country || "India",
        pincode: address.pincode || "",
      }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setAddrLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { products } = await fetchProducts({ limit: 200 });
      setProducts(products);
      const fromLink =
        productParam &&
        products.find(
          (p) => p.slug === productParam || p.id === productParam
        );
      const first = fromLink || products[0];

      // The list endpoint strips filaments — fetch the full payload for
      // the deep-linked product so we can validate the handoff params.
      let fromLinkFull = null;
      if (fromLink) {
        fromLinkFull = await fetchProductBySlug(fromLink.slug || fromLink.id);
        if (fromLinkFull) {
          setFullProductMap((m) => ({ ...m, [String(fromLinkFull.id)]: fromLinkFull }));
        }
      }

      // PDP → bulk handoff: baseType / familyKey / colorId arrive as URL
      // params. Only trust them if they map to a real filament record on
      // the product the row is bound to.
      const baseTypeParam = params.get("baseType") || "";
      const familyKeyParam = params.get("familyKey") || "";
      const colorIdParam = params.get("colorId") || "";
      let filamentPicks = { baseType: "", familyKey: "", colorId: "" };
      const filamentSource = fromLinkFull || fromLink;
      if (filamentSource && (filamentSource.filaments || []).length > 0) {
        const matching = (filamentSource.filaments || []).find(
          (f) =>
            f.type === baseTypeParam &&
            (f.colorFamily?.id || "__none__") === familyKeyParam &&
            (f.colors || []).some((c) => c.id === colorIdParam)
        );
        if (matching) {
          filamentPicks = {
            baseType: baseTypeParam,
            familyKey: familyKeyParam,
            colorId: colorIdParam,
          };
        } else if (
          baseTypeParam &&
          (filamentSource.filaments || []).some((f) => f.type === baseTypeParam)
        ) {
          // partial handoff — carry the base type so the picker opens there
          filamentPicks = { baseType: baseTypeParam, familyKey: "", colorId: "" };
        }
      }
      if (first)
        setLinesRaw((ls) =>
          ls.map((l, i) =>
            i === 0 && !l.productId
              ? {
                  ...l,
                  productId: first.id,
                  // keep only PDP picks that are real options of this product
                  options: fromLink
                    ? Object.fromEntries(
                        (fromLink.options || [])
                          .filter((o) =>
                            (o.values || []).some(
                              (v) => v.value === optionsParam[o.name]
                            )
                          )
                          .map((o) => [o.name, optionsParam[o.name]])
                      )
                    : {},
                  ...filamentPicks,
                }
              : l
          )
        );
      if (fromLink) {
        if (isCustom) {
          setForm((f) =>
            f.requirements
              ? f
              : { ...f, requirements: `Custom order based on ${fromLink.name}: ` }
          );
          setRefsRaw((rs) =>
            rs[0] && !rs[0].productId
              ? [{ ...rs[0], productId: fromLink.id }, ...rs.slice(1)]
              : rs
          );
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productParam, isCustom]);

  // the filled-in rows, with the same product + variant merged into one line
  const chosen = useMemo(() => {
    const byKey = new Map();
    for (const l of lines) {
      const p =
        fullProductMap[String(l.productId)] ||
        productMap.get(String(l.productId));
      if (!p) continue;
      const selectedOptions = (p.options || [])
        .filter((o) => l.options?.[o.name])
        .map((o) => ({ name: o.name, value: l.options[o.name] }));

      // when the product has filaments and the three picks resolve to a
      // real color, fold them into selectedOptions so the desk sees them
      // alongside Size — same shape the cart line uses
      const filamentsList = p.filaments || [];
      if (filamentsList.length > 0 && l.baseType && l.familyKey && l.colorId) {
        for (const f of filamentsList) {
          if (f.type !== l.baseType) continue;
          if ((f.colorFamily?.id || "__none__") !== l.familyKey) continue;
          const col = (f.colors || []).find((c) => c.id === l.colorId);
          if (col) {
            selectedOptions.push({ name: "Filament", value: f.name });
            selectedOptions.push({ name: "Color", value: col.name });
            break;
          }
        }
      }

      const key = `${p.id}|${selectedOptions
        .map((o) => `${o.name}=${o.value}`)
        .join("&")}`;
      const prev = byKey.get(key);
      byKey.set(key, {
        key,
        product: p,
        selectedOptions,
        qty: (prev?.qty || 0) + l.qty,
      });
    }
    return [...byKey.values()];
  }, [lines, productMap, fullProductMap]);

  const variantLabel = (opts) =>
    opts.length ? ` (${opts.map((o) => o.value).join(" / ")})` : "";

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!token) {
      window.dispatchEvent(new CustomEvent("oros:require-auth"));
      return;
    }
    if (!form.phone || form.phone.length < 10)
      return setErr("A valid phone number is required");
    for (const [k, label] of [
      ["name", "Name"],
      ["email", "Email"],
      ["addressLine1", "Address line 1"],
      ["city", "City"],
      ["state", "State"],
      ["country", "Country"],
      ["pincode", "Pincode"],
    ]) {
      if (!form[k]?.trim()) return setErr(`${label} is required`);
    }

    if (!isCustom) {
      const empty = lines.findIndex((l) => !l.productId);
      if (empty !== -1)
        return setErr(
          lines.length > 1
            ? `Select a product for row ${empty + 1}, or remove that row`
            : "Select a product"
        );
      if (chosen.length === 0) return setErr("Add at least one product");
      // every option must be picked on each row, same as the PDP
      for (let i = 0; i < lines.length; i++) {
        const p = resolveProduct(lines[i].productId);
        const missing = (p?.options || []).find(
          (o) => !lines[i].options?.[o.name]
        );
        if (missing)
          return setErr(
            `Choose a ${missing.name} for ${p.name}${
              lines.length > 1 ? ` (row ${i + 1})` : ""
            }`
          );

        // filament picker is required when the product offers filaments
        const rowSuffix = lines.length > 1 ? ` (row ${i + 1})` : "";
        const filamentsList = p?.filaments || [];
        if (filamentsList.length > 0) {
          if (!lines[i].baseType)
            return setErr(`Choose a filament for ${p.name}${rowSuffix}`);
          if (!lines[i].familyKey)
            return setErr(`Choose a color family for ${p.name}${rowSuffix}`);
          if (!lines[i].colorId)
            return setErr(`Choose a color for ${p.name}${rowSuffix}`);
        }
      }
    }

    setSending(true);
    try {
      const fd = new FormData();
      fd.append("type", isCustom ? "CUSTOM" : "BULK");
      fd.append("name", form.name);
      fd.append("phone", form.phone);
      fd.append("email", form.email);
      fd.append("company", form.company);
      fd.append("taxRegNo", form.taxRegNo);
      if (form.deadline) fd.append("deadline", form.deadline);

      const preferred = refs
        .map((r) => ({
          product: productMap.get(String(r.productId)),
          qty: Math.max(1, Number(r.qty) || 1),
        }))
        .filter((r) => r.product);
      fd.append(
        "requirements",
        isCustom
          ? [
              form.requirements,
              preferred.length
                ? `Closest products in range: ${preferred
                    .map(({ product: p, qty }) => `${qty} × ${p.name}`)
                    .join("; ")}`
                : "",
              form.variantDetails
                ? `Variant / spec needed (not in catalogue): ${form.variantDetails}`
                : "",
            ]
              .filter(Boolean)
              .join("\n")
          : [
              chosen
                .map(
                  ({ product: p, qty, selectedOptions }) =>
                    `${qty} × ${p.name}${variantLabel(selectedOptions)}${
                      p.sku ? ` (SKU ${p.sku})` : ""
                    }`
                )
                .join("; "),
              form.requirements || "",
            ]
              .filter(Boolean)
              .join(". ")
      );
      fd.append(
        "shippingAddress",
        JSON.stringify({
          name: form.name,
          phone: form.phone,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          city: form.city,
          state: form.state,
          country: form.country,
          pincode: form.pincode,
        })
      );
      if (!isCustom) {
        fd.append(
          "items",
          JSON.stringify(
            chosen.map(({ product: p, qty, selectedOptions }) => ({
              productId: p.id,
              qty,
              selectedOptions,
            }))
          )
        );
      } else if (isCustom && preferred.length) {
        fd.append(
          "items",
          JSON.stringify(
            preferred.map(({ product: p, qty }) => ({ productId: p.id, qty }))
          )
        );
      }
      // no preferred product picked — that's fine, the desk prices a
      // free-text custom request by hand; the backend defaults its
      // placeholder item to qty 1
      // POST /quotation reads these off the "files" field (multer .array("files"))
      // 3D files are a custom-project thing; bulk quotes don't take them
      if (isCustom) for (const f of files) fd.append("files", f);

      const res = await createQuotation(fd);
      setCreated({
        ...res.quotation,
        items:
          res.quotationItems ||
          (res.quotationItem ? [res.quotationItem] : []),
        files: res.quotationFiles || [],
        messages: res.quotationMessage ? [res.quotationMessage] : [],
      });
      // the confirmation view is much shorter than the form — start at the top
      scrollToTop();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  };

  if (created) {
    return (
      <div className="mx-auto max-w-[820px] px-4 pb-20 lg:px-8">
        <nav className="flex items-center gap-1.5 py-4 text-xs text-ink-3">
          <Link href="/" className="hover:text-flame">
            Home
          </Link>
          <CaretRight size={11} />
          <span className="font-semibold text-ink">
            {isCustom ? "Custom quote" : "Wholesale"}
          </span>
        </nav>
        <div className="rounded-2xl border border-line bg-shell p-6 lg:p-8">
          <p className="font-display text-2xl font-extrabold text-ink">
            Request sent to the desk
          </p>
          <p className="mt-1 text-sm text-ink-3">
            Follow it right here, or any time from{" "}
            <Link
              href="/account?tab=quotations"
              className="font-bold text-flame"
            >
              your account
            </Link>
            .
          </p>
          <div className="mt-6 border-t border-line pt-6">
            <QuotationThread
              quotation={created}
              productMap={productMap}
              onChange={reloadCreated}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-4 pb-20 lg:px-8">
      {ConfirmDialog}
      <nav className="flex items-center gap-1.5 py-4 text-xs text-ink-3">
        <Link href="/" className="hover:text-flame">
          Home
        </Link>
        <CaretRight size={11} />
        <span className="font-semibold text-ink">
          {isCustom ? "Custom quote" : "Wholesale"}
        </span>
      </nav>

      <div className="border-b border-line pb-8">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-none tracking-[-0.03em] text-ink">
          {isCustom ? "Request a custom quote" : "Wholesale"}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
          {isCustom
            ? "Tell us what you need — dimensions, materials, finishing, quantities. The desk comes back with pricing and a lead time on the quotation."
            : "Pick your products and quantities, send them to the desk, and they'll come back on the quotation with a per-unit price, tax, freight and a lead time. Talk it through in the thread — pay once it's final."}
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href="/bulk"
            className={`rounded-lg border px-4 py-2 text-xs font-bold ${
              !isCustom
                ? "border-flame bg-flame-lt text-flame"
                : "border-line text-ink-2"
            }`}
          >
            Bulk quote
          </Link>
          <Link
            href="/custom"
            className={`rounded-lg border px-4 py-2 text-xs font-bold ${
              isCustom
                ? "border-flame bg-flame-lt text-flame"
                : "border-line text-ink-2"
            }`}
          >
            Custom project
          </Link>
        </div>
      </div>

      {!isCustom && (
        <section className="order-1 mt-8 rounded-2xl border border-line bg-shell p-6 lg:p-8">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
            What are you ordering?
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            Pick one or more products and quantities. The desk prices every bulk
            order by hand — the numbers come back to you on the quotation.
          </p>

          <div className="mt-6 space-y-3">
            {lines.map((l, i) => {
              const p = resolveProduct(l.productId);
              return (
                <div
                  key={i}
                  className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-xl border border-line p-3 sm:grid-cols-[64px_minmax(0,1fr)_140px_auto] sm:items-end"
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-canvas">
                    {p && (
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                      Product{lines.length > 1 ? ` ${i + 1}` : ""}
                      <span className="text-flame"> *</span>
                    </span>
                    <select
                      value={l.productId}
                      onChange={(e) =>
                        setLine(i, {
                          productId: e.target.value,
                          options: {},
                          baseType: "",
                          familyKey: "",
                          colorId: "",
                        })
                      }
                      className={`h-11 w-full rounded-lg border bg-shell px-3 text-sm font-bold outline-none focus:border-flame ${
                        l.productId ? "border-line text-ink" : "border-flame/50 text-ink-3"
                      }`}
                    >
                      <option value="" disabled>
                        Select product
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.categoryName ? ` — ${p.categoryName}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="col-span-2 block sm:col-span-1">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                      Quantity<span className="text-flame"> *</span>
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={l.qty}
                      onChange={(e) =>
                        setLine(i, {
                          qty: Math.max(
                            1,
                            Math.min(100000, Number(e.target.value) || 1)
                          ),
                        })
                      }
                      className="no-spin h-11 w-full rounded-lg border border-line px-3 font-display text-lg font-extrabold text-ink outline-none focus:border-flame"
                    />
                  </label>

                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      aria-label="Remove product"
                      className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-xs font-bold text-ink-3 transition-colors hover:border-flame hover:text-flame sm:col-span-1"
                    >
                      <Trash size={14} />
                      <span className="sm:hidden">Remove</span>
                    </button>
                  )}

                  {/* ── variant options + filament picker, same pills as the PDP ── */}
                  {p &&
                    ((p.options || []).length > 0 ||
                      (p.filaments || []).length > 0) && (
                      <div className="col-span-full space-y-4 border-t border-dashed border-line pt-3">
                        {(p.options || []).map((opt) => (
                          <div key={opt.id || opt.name}>
                            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                              {opt.name}
                              <span className="text-flame"> *</span>
                              <span className="ml-2 normal-case font-semibold tracking-normal text-ink-2">
                                {l.options?.[opt.name] || "Choose one"}
                              </span>
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {(opt.values || []).map((v) => {
                                const on = l.options?.[opt.name] === v.value;
                                return (
                                  <button
                                    type="button"
                                    key={v.id || v.value}
                                    onClick={() => {
                                      setLineOption(i, opt.name, v.value);
                                      setErr("");
                                    }}
                                    aria-pressed={on}
                                    className={`flex items-center gap-2 rounded-full border-2 py-1 pr-3.5 transition-all ${
                                      opt.type === "COLOR" ? "pl-1" : "pl-3.5"
                                    } ${
                                      on
                                        ? "border-ink bg-ink text-white"
                                        : "border-line text-ink-2 hover:border-ink-5"
                                    }`}
                                  >
                                    {opt.type === "COLOR" && (
                                      <span
                                        className="h-6 w-6 rounded-full ring-1 ring-inset ring-black/10"
                                        style={{ backgroundColor: colorHex(v.value) }}
                                      />
                                    )}
                                    <span className="text-sm font-bold">
                                      {v.value}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {(p.filaments || []).length > 0 && (
                          <FilamentPicker
                            product={p}
                            line={l}
                            onChange={(patch) => {
                              setLineFilament(i, patch);
                              setErr("");
                            }}
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => addVariant(i)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink-2 transition-colors hover:border-flame hover:text-flame"
                        >
                          <Plus size={12} weight="bold" />
                          Add another variant of {p.name}
                        </button>
                      </div>
                    )}
                </div>
              );
            })}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={addLine}
                disabled={products.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-flame px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-flame transition-colors hover:bg-flame-lt disabled:opacity-40"
              >
                <Plus size={14} weight="bold" />
                Add another product
              </button>
              <a
                href="#enquiry"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-gold-dk"
              >
                Continue to details
                <CaretRight size={14} weight="bold" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ══ Enquiry ══ */}
      <section
        id="enquiry"
        className="order-2 mt-12 rounded-2xl border border-line bg-shell p-6 lg:p-8"
      >
        {
          <>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
              {isCustom ? "Describe your project" : "Send this spec to the desk"}
            </h2>
            {!token && (
              <p className="mt-2 rounded-lg bg-gold-lt px-3 py-2 text-xs font-semibold text-ink-2">
                Tip: log in first so this quote is saved to your account.
              </p>
            )}

            {!isCustom && chosen.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {chosen.map(({ key, product: p, qty, selectedOptions }) => (
                  <span
                    key={key}
                    className="rounded-xl bg-canvas px-3 py-2 text-sm font-bold text-ink"
                  >
                    {qty.toLocaleString("en-IN")} × {p.name}
                    {variantLabel(selectedOptions)}
                  </span>
                ))}
                <span className="text-sm font-semibold text-ink-2">
                  · priced by the desk
                </span>
              </div>
            )}

            <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
              <RequiredField>
                <input
                  required
                  placeholder="Contact name"
                  value={form.name}
                  onChange={set("name")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <RequiredField>
                <input
                  required
                  placeholder="Phone"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <RequiredField>
                <input
                  required
                  type="email"
                  placeholder="Work email"
                  value={form.email}
                  onChange={set("email")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <input
                placeholder="Company (optional)"
                value={form.company}
                onChange={set("company")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <input
                placeholder="GST / Tax reg. no. (optional)"
                value={form.taxRegNo}
                onChange={set("taxRegNo")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame"
              />
              <label className="flex h-12 items-center gap-2 rounded-xl border border-line px-4 text-sm text-ink-3 focus-within:border-flame">
                <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-ink-4">
                  Needed by
                </span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={set("deadline")}
                  className="w-full bg-transparent text-ink outline-none"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                  Requirements
                  {isCustom ? (
                    <>
                      <span className="text-flame"> *</span>
                      <span className="normal-case font-normal tracking-normal text-ink-3">
                        {" "}
                        (want your own 3D model printed? mention the quantity
                        here too)
                      </span>
                    </>
                  ) : (
                    " (optional)"
                  )}
                </span>
                <textarea
                  required={isCustom}
                  placeholder={
                    isCustom
                      ? "What do you need? Sizes, materials, finish, quantity, deadline…"
                      : "Anything else the desk should know (optional)"
                  }
                  value={form.requirements}
                  onChange={set("requirements")}
                  rows={3}
                  className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-flame"
                />
              </label>

              {isCustom && (
                <>
                  {/* reference products — each one only once; a product
                      picked in one row is left out of the others */}
                  <div className="space-y-2 sm:col-span-2">
                    <span className="block text-xs font-bold uppercase tracking-wider text-ink-4">
                      Closest products in our range (optional)
                    </span>
                    {refs.map((r, i) => {
                      const takenElsewhere = new Set(
                        refs
                          .filter((_, j) => j !== i)
                          .map((x) => String(x.productId))
                          .filter(Boolean)
                      );
                      return (
                        <div
                          key={i}
                          className="grid grid-cols-[minmax(0,1fr)_110px_auto] items-center gap-2"
                        >
                          <select
                            value={r.productId}
                            onChange={(e) =>
                              setRef(i, { productId: e.target.value })
                            }
                            className="h-12 w-full rounded-xl border border-line bg-shell px-4 text-sm font-semibold text-ink outline-none focus:border-flame"
                          >
                            <option value="">— not sure / nothing close —</option>
                            {products
                              .filter((p) => !takenElsewhere.has(String(p.id)))
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                  {p.categoryName ? ` — ${p.categoryName}` : ""}
                                </option>
                              ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            aria-label="Quantity needed"
                            placeholder="Qty"
                            disabled={!r.productId}
                            value={r.productId ? r.qty : ""}
                            onChange={(e) =>
                              setRef(i, {
                                qty: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="no-spin h-12 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-flame disabled:opacity-40"
                          />
                          {refs.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeRef(i)}
                              aria-label="Remove reference product"
                              className="grid h-12 w-12 place-items-center rounded-xl border border-line text-ink-3 transition-colors hover:border-flame hover:text-flame"
                            >
                              <Trash size={14} />
                            </button>
                          ) : (
                            <span className="w-12" />
                          )}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={addRef}
                      disabled={
                        refs.some((r) => !r.productId) ||
                        refs.length >= products.length
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink-2 transition-colors hover:border-flame hover:text-flame disabled:opacity-40"
                    >
                      <Plus size={12} weight="bold" />
                      Add another reference product
                    </button>
                  </div>

                  <input
                    placeholder="Which colour / size / material do you need that we don't list?"
                    value={form.variantDetails}
                    onChange={set("variantDetails")}
                    className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame sm:col-span-2"
                  />
                </>
              )}

              {/* ── Shipping address (required by the backend) ── */}
              <div className="flex items-center justify-between sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-4">
                  Delivery address
                </p>
                {token && (
                  <button
                    type="button"
                    onClick={useMyAddress}
                    disabled={addrLoading}
                    className="rounded-lg border border-flame px-3 py-1.5 text-xs font-bold text-flame transition-colors hover:bg-flame-lt disabled:opacity-50"
                  >
                    {addrLoading ? "Loading…" : "Use my saved address"}
                  </button>
                )}
              </div>
              <RequiredField className="sm:col-span-2">
                <input
                  required
                  placeholder="Address line 1"
                  value={form.addressLine1}
                  onChange={set("addressLine1")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <input
                placeholder="Address line 2 (optional)"
                value={form.addressLine2}
                onChange={set("addressLine2")}
                className="h-12 rounded-xl border border-line px-4 text-sm outline-none focus:border-flame sm:col-span-2"
              />
              <RequiredField>
                <input
                  required
                  placeholder="City"
                  value={form.city}
                  onChange={set("city")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <RequiredField>
                <input
                  required
                  placeholder="State"
                  value={form.state}
                  onChange={set("state")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <RequiredField>
                <input
                  required
                  placeholder="Country"
                  value={form.country}
                  onChange={set("country")}
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>
              <RequiredField>
                <input
                  required
                  placeholder="Pincode"
                  inputMode="numeric"
                  value={form.pincode}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  className="h-12 w-full rounded-xl border border-line px-4 pr-7 text-sm outline-none focus:border-flame"
                />
              </RequiredField>

              {isCustom && (
              <label className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-3 sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-4">
                  3D model files (optional, up to 10)
                  <span className="normal-case font-normal tracking-normal text-ink-3">
                    {" "}
                    — {MODEL_FORMATS.join(", ")}
                  </span>
                </span>
                <input
                  type="file"
                  multiple
                  accept={MODEL_ACCEPT}
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || []);
                    const wrongType = picked.filter((f) => !isModelFile(f.name));
                    const tooBig = picked.filter(
                      (f) =>
                        isModelFile(f.name) &&
                        f.size > MODEL_MAX_MB * 1024 * 1024
                    );
                    const ok = picked.filter(
                      (f) =>
                        isModelFile(f.name) &&
                        f.size <= MODEL_MAX_MB * 1024 * 1024
                    );
                    setErr(
                      tooBig.length
                        ? `${
                            tooBig.length === 1
                              ? tooBig[0].name
                              : `${tooBig.length} files`
                          } exceed the ${MODEL_MAX_MB} MB limit and were skipped`
                        : wrongType.length
                          ? `Some files were skipped — only 3D models (${MODEL_FORMATS.join(
                              ", "
                            )}) can be attached`
                          : ""
                    );
                    // each pick adds to what's already attached (skipping
                    // duplicates) — the route takes up to 10
                    const merged = [...files];
                    for (const f of ok) {
                      if (
                        !merged.some(
                          (x) => x.name === f.name && x.size === f.size
                        )
                      )
                        merged.push(f);
                    }
                    if (merged.length > 10 && !tooBig.length && !wrongType.length)
                      setErr("Only 10 files can be attached — the extra ones were skipped");
                    setFiles(merged.slice(0, 10));
                    // let the same file be picked again after removing it
                    e.target.value = "";
                  }}
                  className="block w-full text-xs text-ink-2 file:mr-3 file:rounded-lg file:border-0 file:bg-canvas file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-ink"
                />
                {files.length > 0 && (
                  <>
                    <span className="mt-2 block text-xs text-ink-3">
                      {files.length} / 10 file{files.length === 1 ? "" : "s"}{" "}
                      attached — pick again to add more
                    </span>
                    <ul className="mt-2 space-y-1.5">
                      {files.map((f, i) => (
                        <li
                          key={`${f.name}-${f.size}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-canvas px-3 py-1.5 text-xs"
                        >
                          <span className="min-w-0 truncate font-semibold text-ink">
                            {f.name}
                            <span className="ml-2 font-normal text-ink-3">
                              {(f.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setFiles((fs) => fs.filter((_, j) => j !== i));
                            }}
                            aria-label={`Remove ${f.name}`}
                            className="shrink-0 text-ink-3 hover:text-flame"
                          >
                            <Trash size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </label>
              )}

              {err && (
                <p className="text-xs font-semibold text-flame sm:col-span-2">
                  {err}
                </p>
              )}
              <button
                type="submit"
                disabled={sending}
                className="h-12 rounded-xl bg-gold px-8 text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-gold-dk disabled:opacity-60 sm:col-span-2"
              >
                {sending
                  ? "Sending…"
                  : token
                    ? "Send request"
                    : "Log in to send request"}
              </button>
            </form>
          </>
        }
      </section>
    </div>
  );
}
