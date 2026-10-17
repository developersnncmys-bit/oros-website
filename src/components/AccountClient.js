"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SquaresFour,
  Package,
  PencilSimple,
  SignOut,
  UserCircle,
  Check,
  FileText,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { useAuthStore, useUser } from "@/store/authStore";
import { formatINR } from "@/lib/format";
import { fetchProducts } from "@/lib/catalog";
import { payForOrder } from "@/lib/razorpay";
import { useFocusRow } from "@/lib/focusRow";
import QuotationThread from "@/components/QuotationThread";
import { useConfirm } from "@/components/ConfirmDialog";
import * as userApi from "@/api/user.api";
import * as orderApi from "@/api/order.api";
import * as quotationApi from "@/api/quotation.api";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: SquaresFour },
  { id: "orders", label: "My orders", icon: Package },
  { id: "quotations", label: "Quotations", icon: FileText },
  { id: "profile", label: "Edit profile", icon: PencilSimple },
];

// backend blocks cancellation once production has started or the order is done,
// and only lets the customer cancel STORE or QUOTATION orders (never MANUAL)
const NON_CANCELLABLE = ["IN_PRODUCTION", "COMPLETED", "CANCELLED"];
const CANCELLABLE_SOURCES = ["STORE", "QUOTATION"];
const canCancelOrder = (o) =>
  CANCELLABLE_SOURCES.includes(o?.source) &&
  !NON_CANCELLABLE.includes(o?.status);

const STATUS_TONE = {
  PENDING_PAYMENT: "bg-gold-lt text-gold-dk",
  PAID: "bg-leaf-lt text-leaf",
  CONFIRMED: "bg-leaf-lt text-leaf",
  PROCESSING: "bg-sky-lt text-sky",
  IN_PRODUCTION: "bg-sky-lt text-sky",
  COMPLETED: "bg-leaf-lt text-leaf",
  CANCELLED: "bg-flame-lt text-flame",
};

const SOURCE_TONE = {
  STORE: "bg-sky-lt text-sky",
  QUOTATION: "bg-lilac-lt text-lilac",
  MANUAL: "bg-gold-lt text-gold-dk",
};

// STORE / QUOTATION / MANUAL — a quotation-born order also carries the
// quotation's own BULK / CUSTOM type once /user/profile … order.quotation
// is populated by the backend
function SourceBadge({ order }) {
  const source = order.source || "STORE";
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`rounded px-2 py-1 text-[11px] font-bold ${
          SOURCE_TONE[source] || "bg-canvas text-ink-2"
        }`}
      >
        {source}
      </span>
      {source === "QUOTATION" && order.quotation?.type && (
        <span className="rounded bg-canvas px-2 py-1 text-[11px] font-bold text-ink-2">
          {order.quotation.type}
        </span>
      )}
    </span>
  );
}

export default function AccountClient() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") || "dashboard";
  useFocusRow();

  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);
  const { user, firstName, greeting } = useUser();
  const { confirm, ConfirmDialog } = useConfirm();

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPagination, setOrdersPagination] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [productMap, setProductMap] = useState(() => new Map());

  // gate — no token, no account
  useEffect(() => {
    if (hydrated && !token) {
      window.dispatchEvent(new CustomEvent("oros:require-auth"));
      router.replace("/");
    }
  }, [hydrated, token, router]);

  const loadOrders = (page = ordersPage) => {
    if (!token) return;
    setOrdersLoading(true);
    orderApi
      .getMyOrders({ page, limit: 10 })
      .then((res) => {
        setOrders(res?.orders || []);
        setOrdersPagination(res?.pagination || null);
      })
      .catch(() => {
        setOrders([]);
        setOrdersPagination(null);
      })
      .finally(() => setOrdersLoading(false));
  };

  const loadQuotes = () => {
    if (!token) return;
    quotationApi
      .listQuotations({ limit: 50 })
      .then((res) => setQuotes(res?.quotation || []))
      .catch(() => setQuotes([]))
      .finally(() => setQuotesLoading(false));
  };

  useEffect(() => {
    loadOrders(1);
    setOrdersPage(1);
    loadQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // a notification click stamps `?t=` — pull the latest quotes / orders so
  // the row it points at shows its newest state, even on the same page
  const refreshStamp = params.get("t");
  useEffect(() => {
    if (!refreshStamp) return;
    loadQuotes();
    loadOrders(ordersPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshStamp]);

  useEffect(() => {
    if (ordersPage !== 1) loadOrders(ordersPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersPage]);

  useEffect(() => {
    fetchProducts({ limit: 200 })
      .then(({ products }) =>
        setProductMap(new Map(products.map((p) => [String(p.id), p])))
      )
      .catch(() => {});
  }, []);

  const quotesById = useMemo(
    () => new Map(quotes.map((q) => [String(q._id), q])),
    [quotes]
  );

  const stats = useMemo(() => {
    const paid = orders.filter((o) =>
      ["PAID", "CONFIRMED", "PROCESSING", "IN_PRODUCTION", "COMPLETED"].includes(
        o.status
      )
    );
    const spent = paid.reduce((n, o) => n + (o.pricing?.total || 0), 0);
    return { total: orders.length, paid: paid.length, spent };
  }, [orders]);

  const cancelOrder = async (id) => {
    const res = await orderApi.cancelOrder(id);
    const updated = res?.order || res?.data?.order || null;
    setOrders((list) =>
      list.map((o) =>
        o._id === id ? { ...o, ...(updated || { status: "CANCELLED" }) } : o
      )
    );
  };

  const go = (id) =>
    router.push(id === "dashboard" ? "/account" : `/account?tab=${id}`);

  if (!token) return null;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 lg:px-6">
      <div className="mb-6 flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-canvas text-ink">
          {user?.profileImage ? (
            <Image
              src={user.profileImage}
              alt={firstName}
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-display text-xl font-extrabold">
              {firstName.charAt(0).toUpperCase() || <UserCircle size={26} />}
            </span>
          )}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
            {greeting}
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            {user?.name || firstName}
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* ── side nav ── */}
        <TabScroller>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                tab === id
                  ? "bg-ink text-white"
                  : "text-ink-2 hover:bg-canvas"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <button
            onClick={async () => {
              if (!(await confirm("Sign out of your account?", "Sign out")))
                return;
              logout();
              router.push("/");
            }}
            className="flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold text-flame transition-colors hover:bg-flame-lt"
          >
            <SignOut size={16} />
            Sign out
          </button>
        </TabScroller>

        {/* ── panel ── */}
        <div>
          {tab === "dashboard" && (
            <Dashboard
              stats={stats}
              orders={orders}
              loading={ordersLoading}
              onGo={go}
              quotesById={quotesById}
            />
          )}
          {tab === "orders" && (
            <Orders
              orders={orders}
              loading={ordersLoading}
              onCancel={cancelOrder}
              onChange={loadOrders}
              page={ordersPage}
              setPage={setOrdersPage}
              pagination={ordersPagination}
              quotesById={quotesById}
            />
          )}
          {tab === "quotations" && (
            <Quotations
              quotes={quotes}
              loading={quotesLoading}
              productMap={productMap}
              onChange={loadQuotes}
            />
          )}
          {tab === "profile" && <ProfileForm />}
        </div>
      </div>
      {ConfirmDialog}
    </div>
  );
}

/**
 * The account tabs: a sidebar on desktop, a sideways strip on phones. On
 * phones the scrollbar is hidden (it showed as a stray orange line) and
 * ‹ › arrows appear only while there are more tabs off-screen that way.
 */
function TabScroller({ children }) {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const nudge = (dir) =>
    ref.current?.scrollBy({ left: dir * 160, behavior: "smooth" });

  const arrow =
    "absolute top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-shell text-ink shadow-md ring-1 ring-line lg:hidden";

  return (
    <div className="relative min-w-0">
      <nav
        ref={ref}
        className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth lg:flex-col lg:overflow-visible"
      >
        {children}
      </nav>
      {edges.left && (
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Scroll tabs left"
          className={`${arrow} left-0`}
        >
          <CaretLeft size={15} weight="bold" />
        </button>
      )}
      {edges.right && (
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Scroll tabs right"
          className={`${arrow} right-0`}
        >
          <CaretRight size={15} weight="bold" />
        </button>
      )}
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-shell p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ink">
        {value}
      </p>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <dt className="text-ink-4">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  );
}

function Dashboard({ stats, orders, loading, onGo, quotesById }) {
  const recent = orders.slice(0, 3);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card label="Orders" value={stats.total} />
        <Card label="Paid" value={stats.paid} />
        <Card label="Total spent" value={formatINR(stats.spent)} />
      </div>

      <div className="rounded-xl border border-line bg-shell">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-2">
            Recent orders
          </h2>
          <button
            onClick={() => onGo("orders")}
            className="text-xs font-bold text-flame hover:underline"
          >
            View all
          </button>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-ink-3">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-3">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((o) => (
              <OrderRow key={o._id} order={o} quotesById={quotesById} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Quotations({ quotes, loading, productMap, onChange }) {
  if (loading)
    return <p className="text-sm text-ink-3">Loading your quotations…</p>;
  if (quotes.length === 0)
    return (
      <div className="rounded-xl border border-line bg-shell px-6 py-16 text-center">
        <p className="font-display text-lg font-extrabold text-ink">
          No quotations yet
        </p>
        <p className="mt-1 text-sm text-ink-3">
          Bulk and custom requests you send the desk show up here — with the
          desk's pricing, the conversation and a Pay button once it's final.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href="/custom"
            className="rounded-md bg-flame px-6 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white hover:bg-flame-dk"
          >
            Start a custom order
          </Link>
        </div>
      </div>
    );
  return (
    <ul className="space-y-3">
      {quotes.map((q) => (
        <li
          key={q._id}
          data-focus-id={q._id}
          className="rounded-xl border border-line bg-shell p-5"
        >
          <QuotationThread
            quotation={q}
            productMap={productMap}
            onChange={onChange}
          />
        </li>
      ))}
    </ul>
  );
}

function Orders({
  orders,
  loading,
  onCancel,
  onChange,
  page,
  setPage,
  pagination,
  quotesById,
}) {
  if (loading)
    return <p className="text-sm text-ink-3">Loading your orders…</p>;
  if (orders.length === 0)
    return (
      <div className="rounded-xl border border-line bg-shell px-6 py-16 text-center">
        <p className="font-display text-lg font-extrabold text-ink">
          No orders yet
        </p>
        <Link
          href="/shop"
          className="mt-4 inline-block rounded-md bg-flame px-6 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white hover:bg-flame-dk"
        >
          Start shopping
        </Link>
      </div>
    );
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {orders.map((o) => (
          <li
            key={o._id}
            data-focus-id={o._id}
            className="rounded-xl border border-line bg-shell"
          >
            <OrderRow
              order={o}
              expanded
              onCancel={onCancel}
              onChange={onChange}
              quotesById={quotesById}
            />
          </li>
        ))}
      </ul>
      {pagination && (pagination.totalPages > 1 || page > 1) && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-ink-3">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            disabled={!pagination.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, expanded = false, onCancel, onChange, quotesById }) {
  const items = order.items || [];
  const quote =
    order.source === "QUOTATION"
      ? quotesById?.get?.(String(order.quotation?._id || order.quotation))
      : null;
  // rows that don't start expanded (dashboard "recent orders") can be
  // clicked/viewed to reveal the same full detail as the main orders list
  const [open, setOpen] = useState(expanded);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  const pay = async () => {
    setPayErr("");
    setPaying(true);
    try {
      await payForOrder(order, {
        name: order.shippingAddress?.name,
        contact: order.shippingAddress?.phone,
      });
      await onChange?.();
    } catch (e) {
      setPayErr(e.message || "Payment could not be completed");
    } finally {
      setPaying(false);
    }
  };

  const cancel = async () => {
    if (!(await confirm("Cancel this order? This can't be undone."))) return;
    setErr("");
    setBusy(true);
    try {
      await onCancel(order._id);
    } catch (e) {
      setErr(e.message || "Could not cancel the order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="break-all font-mono text-sm font-bold text-ink">
            #{String(order._id).toUpperCase()}
          </p>
          <p className="text-xs text-ink-3">
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {" · "}
            {items.reduce((n, i) => n + (i.qty || 0), 0)} item(s)
          </p>
          <div className="mt-1.5">
            <SourceBadge order={order} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded px-2 py-1 text-[11px] font-bold ${
              STATUS_TONE[order.status] || "bg-canvas text-ink-2"
            }`}
          >
            {order.status?.replace(/_/g, " ")}
          </span>
          <span className="font-display text-base font-extrabold text-ink">
            {formatINR(order.pricing?.total || 0)}
          </span>
          {!expanded && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs font-bold text-flame hover:underline"
            >
              {open ? "Hide" : "View"}
            </button>
          )}
        </div>
      </div>

      {open && items.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
          {items.map((it) => (
            <li
              key={it._id}
              className="flex items-center justify-between text-xs text-ink-2"
            >
              <span className="truncate">
                {it.nameSnapshot} × {it.qty}
              </span>
              <span className="font-semibold">{formatINR(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}
      {open && order.source === "QUOTATION" && order.quotation && (
        <div className="mt-3 space-y-2 rounded-lg border border-line bg-canvas/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-4">
            Quotation details
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
            <span>
              <span className="text-ink-4">Quotation no. </span>
              <span className="font-semibold text-ink">
                {order.quotation.refNumber}
              </span>
            </span>
            <span>
              <span className="text-ink-4">Type </span>
              <span className="font-semibold text-ink">
                {order.quotation.type}
              </span>
            </span>
            {quote?.status && (
              <span>
                <span className="text-ink-4">Quote status </span>
                <span className="font-semibold text-ink">
                  {quote.status.replace(/_/g, " ")}
                </span>
              </span>
            )}
            {quote?.validTill && (
              <span>
                <span className="text-ink-4">Valid till </span>
                <span className="font-semibold text-ink">
                  {new Date(quote.validTill).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </span>
            )}
          </div>

          {quote?.requirements && (
            <p className="whitespace-pre-line text-xs text-ink-2">
              {quote.requirements}
            </p>
          )}

          {quote && (quote.subTotal || quote.tax || quote.shipping || quote.total) ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
              <Row label="Subtotal">{formatINR(quote.subTotal || 0)}</Row>
              <Row label="Tax">{formatINR(quote.tax || 0)}</Row>
              <Row label="Shipping">{formatINR(quote.shipping || 0)}</Row>
              <Row label="Quoted total">{formatINR(quote.total || 0)}</Row>
            </dl>
          ) : null}

          {quote && (quote.files || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quote.files.map((f) => (
                <a
                  key={f._id}
                  href={f.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-flame hover:underline"
                >
                  {f.fileName || "file"}
                </a>
              ))}
            </div>
          )}

          <Link
            href="/account?tab=quotations"
            className="inline-block text-xs font-bold text-flame hover:underline"
          >
            View full conversation →
          </Link>
        </div>
      )}

      {open && (order.shipping?.courierName || order.shipping?.estimatedDelivery) && (
        <p className="mt-2 text-[11px] text-ink-3">
          Delivery: {order.shipping.courierName || "Courier"}
          {order.shipping.estimatedDelivery
            ? ` · est. ${new Date(order.shipping.estimatedDelivery).toLocaleDateString(
                "en-IN",
                { day: "numeric", month: "short", year: "numeric" }
              )}`
            : ""}
        </p>
      )}
      {open && order.payment?.status && (
        <p className="mt-2 text-[11px] text-ink-3">
          Payment: {order.payment.status}
          {order.payment.transactionId
            ? ` · ${order.payment.transactionId}`
            : ""}
        </p>
      )}

      {open && order.status === "PENDING_PAYMENT" && (
        <div className="mt-3 border-t border-line pt-3">
          <button
            onClick={pay}
            disabled={paying}
            className="rounded-md bg-flame px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-60"
          >
            {paying
              ? "Opening…"
              : `Pay ${formatINR(order.pricing?.total || 0)}`}
          </button>
          {payErr && (
            <p className="mt-1.5 text-[11px] font-semibold text-flame">
              {payErr}
            </p>
          )}
        </div>
      )}

      {open && onCancel && canCancelOrder(order) && (
        <div className="mt-3 border-t border-line pt-3">
          <button
            onClick={cancel}
            disabled={busy}
            className="rounded-md border border-flame px-3 py-1.5 text-xs font-bold text-flame transition-colors hover:bg-flame-lt disabled:opacity-60"
          >
            {busy ? "Cancelling…" : "Cancel order"}
          </button>
          {err && (
            <p className="mt-1.5 text-[11px] font-semibold text-flame">{err}</p>
          )}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}

function ProfileForm() {
  const { confirm, ConfirmDialog } = useConfirm();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ name: "", email: "" });
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    userApi
      .getProfile()
      .then(({ user }) => {
        setForm({ name: user.name || "", email: user.email || "" });
        setPreview(user.profileImage || null);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!(await confirm("Save these changes to your profile?", "Save")))
      return;
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      if (file) fd.append("profileImage", file);
      const { user } = await userApi.updateProfile(fd);
      setUser(user);
      setPreview(user.profileImage || preview);
      setFile(null);
      setMsg("Profile updated");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <p className="text-sm text-ink-3">Loading…</p>;

  return (
    <>
      <form
        onSubmit={submit}
        className="max-w-md space-y-4 rounded-xl border border-line bg-shell p-5"
      >
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-canvas">
            {preview ? (
              <Image
                src={preview}
                alt="Profile"
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircle size={30} className="text-ink-3" />
            )}
          </span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink-2 hover:border-ink-5"
          >
            Change photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                setPreview(URL.createObjectURL(f));
              }
            }}
          />
        </div>
  
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-4">
            Name
          </span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-11 w-full rounded-md border border-line px-3.5 text-sm text-ink outline-none focus:border-flame"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-4">
            Email
          </span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-11 w-full rounded-md border border-line px-3.5 text-sm text-ink outline-none focus:border-flame"
          />
        </label>
  
        {err && <p className="text-xs font-semibold text-flame">{err}</p>}
        {msg && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-leaf">
            <Check size={13} weight="bold" /> {msg}
          </p>
        )}
  
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-flame px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
      {ConfirmDialog}
    </>
  );
}
