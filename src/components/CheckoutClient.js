"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  CaretRight,
  MapPin,
  Tag,
  ShoppingCart,
  X,
  Plus,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import ProductImage from "@/components/ProductImage";
import { useConfirm } from "@/components/ConfirmDialog";
import { useCart } from "@/store/cartStore";
import { useAuthStore, useUser } from "@/store/authStore";
import { formatINR } from "@/lib/format";
import * as addressApi from "@/api/address.api";
import * as couponApi from "@/api/coupon.api";
import * as shippingApi from "@/api/shipping.api";
import * as orderApi from "@/api/order.api";
import { payForOrder } from "@/lib/razorpay";
import { scrollToTop } from "@/lib/scrollTop";

/**
 * Shiprocket returns `etd` as a date string ("Sep 12, 2026"); some couriers
 * give a day count instead. Render whichever we got as a friendly line.
 */
function formatEta(etd) {
  if (etd == null || etd === "") return null;
  const d = new Date(etd);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }
  const n = Number(etd);
  if (Number.isFinite(n)) return `${n} day${n === 1 ? "" : "s"}`;
  return String(etd);
}

const EMPTY_ADDRESS = {
  name: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
};

export default function CheckoutClient() {
  const { lines, count, subtotal, savings, clear } = useCart();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { isSignedIn, isCustomer } = useUser();
  const { confirm, ConfirmDialog } = useConfirm();

  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // Form-side state. `showForm` toggles the inline create/edit panel;
  // `editingId` is null for "add new" and the address _id when editing.
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formAddress, setFormAddress] = useState(EMPTY_ADDRESS);
  const [formError, setFormError] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, discount, finalAmount }
  const [couponErr, setCouponErr] = useState("");
  const [showCoupons, setShowCoupons] = useState(false);
  const [available, setAvailable] = useState([]);

  const [shipping, setShipping] = useState(null); // { quoteId, rates }
  const [courierId, setCourierId] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState("");

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(null);

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  // Load the user's saved addresses on sign-in. Default (or most recent)
  // is auto-selected so the shopper can pay without re-picking every visit.
  // No saved addresses at all → open the empty form straight away.
  useEffect(() => {
    if (!token) return;
    addressApi
      .listAddresses()
      .then(({ addresses: list }) => {
        const arr = Array.isArray(list) ? list : [];
        setAddresses(arr);
        const def = arr.find((a) => a.isDefault) || arr[0];
        if (def) setSelectedId(def._id);
        else setShowForm(true);
      })
      .catch(() => {});
  }, [token]);

  // When the shopper is about to add a brand-new address, prefill the form
  // with their account name + phone — otherwise an edit form already carries
  // the saved values.
  useEffect(() => {
    if (user && showForm && !editingId) {
      setFormAddress((a) => ({
        ...a,
        name: a.name || user.name || "",
        phone: a.phone || user.phone || "",
      }));
    }
  }, [user, showForm, editingId]);

  // Re-check the applied coupon whenever the cart subtotal moves. The server
  // re-validates min-order-value and recomputes the discount when the order is
  // placed, so a stale client-side discount would otherwise make checkout fail.
  useEffect(() => {
    if (!coupon?.code) return;
    let cancelled = false;
    couponApi
      .validateCoupon(coupon.code, subtotal)
      .then((data) => {
        if (!cancelled) setCoupon({ code: coupon.code, ...data });
      })
      .catch((e) => {
        if (!cancelled) {
          setCoupon(null);
          setCouponErr(
            `${coupon.code} removed — ${e.message}`
          );
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a._id === selectedId) || null,
    [addresses, selectedId]
  );

  const formComplete = [
    "name",
    "phone",
    "addressLine1",
    "city",
    "state",
    "country",
    "pincode",
  ].every((k) => formAddress[k]?.toString().trim());

  // TEST ONLY — shipping-rate auto-fetch disabled so Razorpay flow can be
  // exercised without a working Shiprocket account. Restore this useEffect
  // (and the one in payNow) before shipping live.
  /*
  useEffect(() => {
    if (!addressComplete || !/^\d{6}$/.test(address.pincode)) return;

    // a still-valid quote already covers this destination
    if (
      shipping?.deliveryPincode === address.pincode &&
      shipping?.expiresAt &&
      new Date(shipping.expiresAt).getTime() > Date.now() + 60_000
    ) {
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      setRatesError("");
      setRatesLoading(true);
      try {
        await addressApi.saveAddress(address);
        const data = await shippingApi.getShippingRates({
          deliveryPincode: address.pincode,
        });
        if (cancelled) return;
        setShipping(data);
        const rates = data.rates || [];
        const cheapest = [...rates].sort(
          (a, b) => (a.totalCharge || 0) - (b.totalCharge || 0)
        )[0];
        setCourierId((cur) =>
          rates.some((r) => Number(r.courierId) === Number(cur))
            ? cur
            : cheapest?.courierId ?? null
        );
      } catch (e) {
        if (cancelled) return;
        setShipping(null);
        setCourierId(null);
        setRatesError(e.message);
      } finally {
        if (!cancelled) setRatesLoading(false);
      }
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    addressComplete,
    address.pincode,
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.country,
    address.name,
    address.phone,
    shipping,
  ]);
  */

  const selectedRate = useMemo(
    () =>
      shipping?.rates?.find(
        (r) => Number(r.courierId) === Number(courierId)
      ) || null,
    [shipping, courierId]
  );

  const deliveryCharge = selectedRate?.totalCharge ?? 0;
  const discount = Math.min(coupon?.discount ?? 0, subtotal);
  const total = Math.max(0, subtotal + deliveryCharge - discount);

  if (placed) return <OrderPlaced order={placed} />;
  if (lines.length === 0) return <EmptyState />;

  const openAddNew = () => {
    setEditingId(null);
    setFormAddress({
      ...EMPTY_ADDRESS,
      name: user?.name || "",
      phone: user?.phone || "",
    });
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (addr) => {
    setEditingId(addr._id);
    setFormAddress({ ...EMPTY_ADDRESS, ...addr });
    setFormError("");
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormAddress(EMPTY_ADDRESS);
    setFormError("");
  };

  const refreshAddresses = async () => {
    const { addresses: list } = await addressApi.listAddresses();
    const arr = Array.isArray(list) ? list : [];
    setAddresses(arr);
    return arr;
  };

  const saveForm = async () => {
    setFormError("");
    if (!formComplete) {
      setFormError("Please fill in every required field.");
      return;
    }
    setSavingAddress(true);
    try {
      if (editingId) {
        await addressApi.updateAddress(editingId, formAddress);
      } else {
        const { address: created } =
          await addressApi.createAddress(formAddress);
        if (created?._id) setSelectedId(created._id);
      }
      await refreshAddresses();
      cancelForm();
    } catch (e) {
      setFormError(e.message || "Couldn't save the address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const removeAddress = async (id) => {
    const target = addresses.find((a) => a._id === id);
    const label = target?.name
      ? `“${target.name}”`
      : "this address";
    const ok = await confirm(
      `Delete ${label}? This address will be removed permanently and cannot be recovered.`,
      "Delete address"
    );
    if (!ok) return;
    try {
      await addressApi.deleteAddress(id);
      const next = await refreshAddresses();
      if (selectedId === id) {
        const fallback = next.find((a) => a.isDefault) || next[0] || null;
        setSelectedId(fallback?._id || null);
        if (!fallback) setShowForm(true);
      }
    } catch (e) {
      setError(e.message || "Couldn't delete that address.");
    }
  };

  const chooseDefault = async (id) => {
    try {
      await addressApi.setDefaultAddress(id);
      await refreshAddresses();
    } catch (e) {
      setError(e.message || "Couldn't set that address as default.");
    }
  };

  const useCurrentLocation = () => {
    setLocateError("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateError("Your browser doesn't support location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url =
            "https://nominatim.openstreetmap.org/reverse" +
            `?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}` +
            "&zoom=18&addressdetails=1";
          const res = await fetch(url, {
            headers: { "Accept-Language": "en" },
          });
          if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
          const data = await res.json();
          const a = data.address || {};
          const line1 = [a.house_number, a.road].filter(Boolean).join(" ");
          const line2 = [a.neighbourhood, a.suburb, a.city_district]
            .filter(Boolean)
            .join(", ");
          setFormAddress((prev) => ({
            ...prev,
            addressLine1: line1 || prev.addressLine1,
            addressLine2: line2 || prev.addressLine2,
            city:
              a.city || a.town || a.village || a.county || prev.city,
            state: a.state || prev.state,
            country: a.country || prev.country,
            pincode: a.postcode || prev.pincode,
          }));
        } catch (e) {
          setLocateError(e.message || "Couldn't look up that location.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied."
            : err.code === err.TIMEOUT
            ? "Location request timed out."
            : "Couldn't get your location."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const applyCoupon = async (code = couponCode) => {
    const c = (code || "").trim().toUpperCase();
    setCouponErr("");
    if (!c) return;
    try {
      const data = await couponApi.validateCoupon(c, subtotal);
      setCoupon({ code: c, ...data });
      setCouponCode(c);
      setShowCoupons(false);
    } catch (e) {
      setCoupon(null);
      setCouponErr(e.message);
    }
  };

  const toggleCoupons = async () => {
    const next = !showCoupons;
    setShowCoupons(next);
    if (next && available.length === 0) {
      try {
        const { coupons } = await couponApi.listCoupons({ limit: 50 });
        const now = Date.now();
        setAvailable(
          (coupons || []).filter(
            (x) =>
              x.isActive !== false &&
              (!x.endDate || new Date(x.endDate).getTime() >= now)
          )
        );
      } catch {}
    }
  };

  const fetchRates = async () => {
    setError("");
    if (!selectedAddress) throw new Error("Pick a delivery address first");
    if (!/^\d{6}$/.test(selectedAddress.pincode))
      throw new Error("Enter a valid 6-digit pincode");
    const data = await shippingApi.getShippingRates({
      deliveryPincode: selectedAddress.pincode,
      addressId: selectedAddress._id,
    });
    setShipping(data);
    const rates = data.rates || [];
    const cheapest = [...rates].sort(
      (a, b) => (a.totalCharge || 0) - (b.totalCharge || 0)
    )[0];
    // keep the courier the customer already picked when it's still on offer
    const chosen = rates.some(
      (r) => Number(r.courierId) === Number(courierId)
    )
      ? courierId
      : cheapest?.courierId ?? null;
    setCourierId(chosen);
    return { data, courier: chosen };
  };

  const payNow = async () => {
    setError("");
    if (!token) {
      window.dispatchEvent(new CustomEvent("oros:require-auth"));
      return;
    }
    if (isSignedIn && !isCustomer) {
      setError(
        "Checkout is for customer accounts only. Sign in with a customer account to place an order."
      );
      return;
    }
    if (!selectedAddress) {
      setError("Please select a delivery address");
      return;
    }
    setPlacing(true);
    try {
      // TEST ONLY — skip shipping quote; backend uses a stub when the
      // IDs are omitted. Restore the fetchRates block below for live use.
      /*
      let quoteId = shipping?.quoteId;
      let courier = courierId;
      const stale =
        shipping?.expiresAt &&
        new Date(shipping.expiresAt).getTime() <= Date.now();
      if (!quoteId || !courier || stale) {
        const r = await fetchRates();
        quoteId = r.data.quoteId;
        courier = r.courier;
      }
      if (!quoteId || !courier)
        throw new Error("No delivery option available for this pincode");
      */

      // 2. order
      const { order } = await orderApi.createOrder({
        addressId: selectedAddress._id,
        couponCode: coupon?.code || undefined,
      });

      // 3. pay + verify
      await payForOrder(order, {
        name: selectedAddress.name,
        contact: selectedAddress.phone,
        email: user?.email || "",
      });

      clear();
      setPlaced({
        id: order._id,
        total: order.pricing?.total ?? total,
        count,
        name: selectedAddress.name,
        pin: selectedAddress.pincode,
        placedAt: order.createdAt || Date.now(),
        eta:
          order.shipping?.estimatedDelivery ||
          selectedRate?.estimatedDays ||
          null,
        courier: order.shipping?.courierName || selectedRate?.courierName || null,
      });
      // the confirmation replaces the whole checkout — show it from the top
      scrollToTop();
    } catch (e) {
      setError(e.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6">
      {ConfirmDialog}
      <nav className="mb-3 flex items-center gap-1.5 text-xs text-ink-3">
        <Link href="/cart" className="hover:text-flame">
          Cart
        </Link>
        <CaretRight size={12} />
        <span className="font-semibold text-ink">Checkout</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {/* ── Address ── */}
          <section className="rounded-lg border border-line bg-shell p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
                <MapPin size={15} /> Delivery address
              </h2>
              {!showForm && addresses.length > 0 && (
                <button
                  onClick={openAddNew}
                  className="flex items-center gap-1.5 rounded-lg border border-flame px-3 py-1.5 text-xs font-bold text-flame transition-colors hover:bg-flame-lt"
                >
                  <Plus size={13} weight="bold" />
                  Add new address
                </button>
              )}
            </div>

            {/* ── Saved addresses list ── */}
            {!showForm && (
              <>
                {addresses.length === 0 ? (
                  <div className="rounded-md border border-dashed border-line bg-canvas px-4 py-6 text-center">
                    <p className="text-sm text-ink-3">
                      No saved addresses yet.
                    </p>
                    <button
                      onClick={openAddNew}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-flame px-3 py-1.5 text-xs font-bold text-flame hover:bg-flame-lt"
                    >
                      <Plus size={13} weight="bold" />
                      Add new address
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {addresses.map((addr) => {
                      const picked = addr._id === selectedId;
                      return (
                        <li
                          key={addr._id}
                          className={`rounded-md border p-3 transition-colors ${
                            picked
                              ? "border-flame bg-flame-lt"
                              : "border-line hover:border-ink-5"
                          }`}
                        >
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="radio"
                              name="checkout-address"
                              checked={picked}
                              onChange={() => setSelectedId(addr._id)}
                              className="mt-1 h-4 w-4 shrink-0 accent-flame"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-ink">
                                  {addr.name}
                                </span>
                                <span className="text-xs text-ink-3">
                                  · {addr.phone}
                                </span>
                                {addr.isDefault && (
                                  <span className="rounded bg-leaf-lt px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-leaf">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-ink-3">
                                {[
                                  addr.addressLine1,
                                  addr.addressLine2,
                                  addr.landmark,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                              <p className="text-xs text-ink-3">
                                {[addr.city, addr.state, addr.country]
                                  .filter(Boolean)
                                  .join(", ")}
                                {addr.pincode ? ` · ${addr.pincode}` : ""}
                              </p>
                            </div>
                          </label>
                          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line/60 pt-2 text-xs">
                            <button
                              onClick={() => openEdit(addr)}
                              className="inline-flex items-center gap-1 font-bold text-ink-2 hover:text-flame"
                            >
                              <PencilSimple size={12} weight="bold" />
                              Edit
                            </button>
                            {!addr.isDefault && (
                              <button
                                onClick={() => chooseDefault(addr._id)}
                                className="inline-flex items-center gap-1 font-bold text-ink-2 hover:text-flame"
                              >
                                Set as default
                              </button>
                            )}
                            <button
                              onClick={() => removeAddress(addr._id)}
                              className="ml-auto inline-flex items-center gap-1 font-bold text-ink-3 hover:text-flame"
                            >
                              <Trash size={12} weight="bold" />
                              Delete
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {/* ── Create / edit form ── */}
            {showForm && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
                    {editingId ? "Edit address" : "New address"}
                  </p>
                  <button
                    onClick={useCurrentLocation}
                    disabled={locating}
                    className="rounded-lg border border-flame px-3 py-1.5 text-xs font-bold text-flame transition-colors hover:bg-flame-lt disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {locating ? "Locating…" : "Use current location"}
                  </button>
                </div>
                {locateError && (
                  <p className="mb-3 text-xs font-semibold text-flame">
                    {locateError}
                  </p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Full name"
                    value={formAddress.name}
                    onChange={(v) =>
                      setFormAddress({ ...formAddress, name: v })
                    }
                  />
                  <Field
                    label="Phone"
                    value={formAddress.phone}
                    inputMode="numeric"
                    onChange={(v) =>
                      setFormAddress({
                        ...formAddress,
                        phone: v.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label="Address line 1"
                      value={formAddress.addressLine1}
                      onChange={(v) =>
                        setFormAddress({
                          ...formAddress,
                          addressLine1: v,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Address line 2 (optional)"
                      required={false}
                      value={formAddress.addressLine2}
                      onChange={(v) =>
                        setFormAddress({
                          ...formAddress,
                          addressLine2: v,
                        })
                      }
                    />
                  </div>
                  <Field
                    label="Landmark (optional)"
                    required={false}
                    value={formAddress.landmark}
                    onChange={(v) =>
                      setFormAddress({ ...formAddress, landmark: v })
                    }
                  />
                  <Field
                    label="City"
                    value={formAddress.city}
                    onChange={(v) =>
                      setFormAddress({ ...formAddress, city: v })
                    }
                  />
                  <Field
                    label="State"
                    value={formAddress.state}
                    onChange={(v) =>
                      setFormAddress({ ...formAddress, state: v })
                    }
                  />
                  <Field
                    label="Country"
                    value={formAddress.country}
                    onChange={(v) =>
                      setFormAddress({ ...formAddress, country: v })
                    }
                  />
                  <Field
                    label="Pincode"
                    value={formAddress.pincode}
                    inputMode="numeric"
                    onChange={(v) =>
                      setFormAddress({
                        ...formAddress,
                        pincode: v.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                  />
                </div>

                {formError && (
                  <p className="mt-3 text-xs font-semibold text-flame">
                    {formError}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={saveForm}
                    disabled={savingAddress}
                    className="rounded-md bg-ink px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-ink-2 disabled:opacity-60"
                  >
                    {savingAddress
                      ? "Saving…"
                      : editingId
                        ? "Save changes"
                        : "Save address"}
                  </button>
                  {addresses.length > 0 && (
                    <button
                      onClick={cancelForm}
                      className="rounded-md border border-line px-5 py-2.5 text-xs font-bold text-ink-2 hover:border-ink-5"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}

            {(ratesLoading || ratesError || shipping?.rates?.length > 0) && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-4">
                  Delivery option
                </p>

                {ratesLoading && (
                  <p className="text-xs text-ink-3">
                    Fetching delivery options for {selectedAddress?.pincode}…
                  </p>
                )}

                {!ratesLoading && ratesError && (
                  <div className="flex items-center justify-between gap-3 rounded-md bg-flame-lt px-3 py-2">
                    <p className="text-xs font-semibold text-flame">
                      {ratesError}
                    </p>
                    <button
                      onClick={() => fetchRates().catch((e) => setRatesError(e.message))}
                      className="shrink-0 text-xs font-bold text-flame underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {!ratesLoading &&
                    (shipping?.rates || []).map((r) => (
                    <label
                      key={r.courierId}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors ${
                        Number(courierId) === Number(r.courierId)
                          ? "border-flame bg-flame-lt"
                          : "border-line hover:border-ink-5"
                      }`}
                    >
                      <input
                        type="radio"
                        name="courier"
                        checked={Number(courierId) === Number(r.courierId)}
                        onChange={() => setCourierId(r.courierId)}
                        className="h-4 w-4 accent-flame"
                      />
                      <span className="flex-1">
                        <span className="block font-semibold text-ink">
                          {r.courierName}
                        </span>
                        {formatEta(r.estimatedDays) && (
                          <span className="block text-xs font-medium text-ink-3">
                            Delivery by {formatEta(r.estimatedDays)}
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-ink">
                        {formatINR(r.totalCharge)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Items ── */}
          <section className="rounded-lg border border-line bg-shell p-5">
            <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-ink-2">
              Order summary ({count} item{count === 1 ? "" : "s"})
            </h2>
            <div className="space-y-3">
              {lines.map((l) => (
                <div key={l.key} className="flex items-center gap-3">
                  <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-md bg-canvas">
                    <ProductImage
                      src={l.product.image}
                      alt={l.product.name}
                      sizes="56px"
                      overlay
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-ink">
                      {l.product.name}
                    </p>
                    <p className="text-xs text-ink-3">
                      {l.variantLabel ? `${l.variantLabel} · ` : ""}Qty {l.qty}
                    </p>
                  </div>
                  <p className="font-display text-sm font-extrabold text-ink">
                    {formatINR(l.lineTotal)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Coupon ── */}
          <section className="rounded-lg border border-line bg-shell p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-2">
              <Tag size={15} /> Coupon
            </h2>

            {coupon ? (
              <div className="flex items-center justify-between rounded-md border border-leaf/40 bg-leaf-lt px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-leaf">
                    {coupon.code} applied
                  </p>
                  <p className="text-xs text-ink-3">
                    You save {formatINR(coupon.discount)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCoupon(null);
                    setCouponCode("");
                  }}
                  className="text-ink-3 hover:text-flame"
                  aria-label="Remove coupon"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    placeholder="Enter code"
                    className="h-11 flex-1 rounded-md border border-line px-3.5 text-sm font-bold uppercase text-ink outline-none focus:border-flame"
                  />
                  <button
                    onClick={() => applyCoupon()}
                    className="rounded-md bg-ink px-5 text-sm font-extrabold text-white transition-colors hover:bg-ink-2"
                  >
                    Apply
                  </button>
                </div>
                {couponErr && (
                  <p className="mt-2 text-xs font-semibold text-flame">
                    {couponErr}
                  </p>
                )}
              </>
            )}

            <button
              onClick={toggleCoupons}
              className="mt-3 text-xs font-bold text-flame hover:underline"
            >
              {showCoupons ? "Hide" : "See available coupons"}
            </button>

            {showCoupons && (
              <ul className="mt-3 space-y-2">
                {available.length === 0 && (
                  <li className="text-xs text-ink-3">No coupons right now.</li>
                )}
                {available.map((c) => (
                  <li
                    key={c._id || c.code}
                    className="flex items-center justify-between rounded-md border border-dashed border-flame/40 bg-flame-lt px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-flame">
                        {c.code}
                      </p>
                      <p className="text-[11px] text-ink-3">
                        {c.discountType === "PERCENTAGE"
                          ? `${c.discountValue}% off`
                          : `${formatINR(c.discountValue)} off`}
                        {c.minOrderValue > 0
                          ? ` · min ${formatINR(c.minOrderValue)}`
                          : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => applyCoupon(c.code)}
                      className="rounded bg-gold px-3 py-1.5 text-[11px] font-extrabold uppercase text-ink hover:bg-gold-dk"
                    >
                      Apply
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── Price panel ── */}
        <aside className="lg:sticky lg:top-[99px] lg:self-start">
          <div className="rounded-lg border border-line bg-shell">
            <h2 className="border-b border-line px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-4">
              Price details
            </h2>
            <div className="space-y-3 px-5 py-4 text-sm">
              <Row label={`Price (${count} item${count === 1 ? "" : "s"})`}>
                {formatINR(subtotal + savings)}
              </Row>
              {savings > 0 && (
                <Row label="Item savings" accent>
                  − {formatINR(savings)}
                </Row>
              )}
              {discount > 0 && (
                <Row label={`Coupon ${coupon.code}`} accent>
                  − {formatINR(discount)}
                </Row>
              )}
              <Row label="Delivery" accent={selectedRate && deliveryCharge === 0}>
                {ratesLoading
                  ? "Calculating…"
                  : selectedRate
                    ? deliveryCharge === 0
                      ? "Free"
                      : formatINR(deliveryCharge)
                    : "Enter address"}
              </Row>
              {selectedRate && (
                <p className="-mt-1 text-xs text-ink-3">
                  {selectedRate.courierName}
                  {formatEta(selectedRate.estimatedDays)
                    ? ` · arrives ${formatEta(selectedRate.estimatedDays)}`
                    : ""}
                </p>
              )}
              <div className="flex items-center justify-between border-t border-dashed border-line pt-3">
                <span className="font-display text-base font-extrabold text-ink">
                  Total payable
                </span>
                <span className="font-display text-xl font-extrabold text-ink">
                  {formatINR(total)}
                </span>
              </div>
            </div>

            <div className="px-5 pb-5">
              {error && (
                <p className="mb-2 rounded bg-flame-lt px-3 py-2 text-xs font-semibold text-flame">
                  {error}
                </p>
              )}
              <button
                onClick={payNow}
                disabled={placing}
                className="w-full rounded-md bg-gold py-4 text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-gold-dk disabled:opacity-60"
              >
                {placing
                  ? "Processing…"
                  : token
                    ? `Pay ${formatINR(total)} with Razorpay`
                    : "Log in to pay"}
              </button>
              <p className="mt-2 text-center text-[11px] text-ink-3">
                Secured by Razorpay. Orders are printed after payment.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required = true, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-4">
        {label}
      </span>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-md border border-line px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-flame"
        {...rest}
      />
    </label>
  );
}

function Row({ label, children, accent = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-3">{label}</span>
      <span className={accent ? "font-bold text-leaf" : "font-semibold text-ink"}>
        {children}
      </span>
    </div>
  );
}

function OrderPlaced({ order }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6">
      <div className="grid place-items-center rounded-lg border border-line bg-shell px-6 py-20 text-center">
        <Image
          src="/brand/oros-logo.jpg"
          alt="OROS"
          width={150}
          height={150}
          className="mb-6 h-12 w-12 object-contain"
        />
        <span className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-leaf-lt">
          <Check size={38} className="text-leaf" weight="bold" />
        </span>
        <h1 className="font-display text-3xl font-extrabold text-ink">
          Payment successful
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-3">
          Thanks {order.name || ""}. We have queued {order.count} item
          {order.count === 1 ? "" : "s"} for printing and will email tracking as
          soon as it dispatches.
        </p>

        <dl className="mt-8 grid w-full max-w-md gap-3 rounded-lg border border-line bg-canvas p-5 text-left text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-3">Order ID</dt>
            <dd className="font-bold text-ink">{order.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">Order date</dt>
            <dd className="font-bold text-ink">
              {new Date(order.placedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">Amount paid</dt>
            <dd className="font-bold text-ink">{formatINR(order.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">Delivering to</dt>
            <dd className="font-bold text-ink">PIN {order.pin}</dd>
          </div>
          {order.eta && formatEta(order.eta) && (
            <div className="flex justify-between">
              <dt className="text-ink-3">Estimated delivery</dt>
              <dd className="font-bold text-ink">
                {formatEta(order.eta)}
                {order.courier ? ` · ${order.courier}` : ""}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-8 flex gap-3">
          <Link
            href="/account?tab=orders"
            className="rounded-md border border-line px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:border-ink-5"
          >
            View orders
          </Link>
          <Link
            href="/shop"
            className="rounded-md bg-gold px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-gold-dk"
          >
            Keep shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6">
      <div className="grid place-items-center rounded-lg border border-line bg-shell px-6 py-24 text-center">
        <span className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-canvas">
          <ShoppingCart size={32} className="text-ink-4" />
        </span>
        <h1 className="font-display text-2xl font-extrabold text-ink">
          Nothing to check out
        </h1>
        <p className="mt-2 max-w-sm text-sm text-ink-3">
          Your cart is empty, so there is nothing to pay for yet.
        </p>
        <Link
          href="/shop"
          className="mt-7 rounded-md bg-gold px-8 py-3.5 text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-gold-dk"
        >
          Shop now
        </Link>
      </div>
    </div>
  );
}
