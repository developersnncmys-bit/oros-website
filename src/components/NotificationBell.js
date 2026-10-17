"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRinging,
  X,
  Trash,
  FileText,
  Package,
  ChatCircleText,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import { useUser } from "@/store/authStore";
import { useConfirm } from "@/components/ConfirmDialog";
import { socket } from "@/lib/socket";
import {
  listNotifications,
  markNotificationRead,
  deleteNotification,
  clearNotifications,
} from "@/api/notification.api";

const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
];

/** query the GET / DELETE endpoints take for a given tab. */
const queryFor = (tab) =>
  tab === "unread"
    ? { isRead: false }
    : tab === "read"
      ? { isRead: true }
      : {};

/** icon + where the notification points, keyed off the backend `type` enum.
 *  `referenceId` is the quotation / order id — carried through as `?focus=` so
 *  the target list scrolls to and highlights that exact row. */
function metaFor(type, referenceId) {
  const focus = referenceId ? `&focus=${referenceId}` : "";
  const qs = `/account?tab=quotations${focus}`;
  const os = `/account?tab=orders${focus}`;
  switch (type) {
    case "ORDER_PAID_AND_PAYMENT_RECEIVED":
      return { Icon: Package, href: os };
    case "QUOTATION_ACCEPTED":
      return { Icon: CheckCircle, href: qs };
    case "QUOTATION_CANCEL":
      return { Icon: XCircle, href: qs };
    case "QUOTATION_MESSAGE":
      return { Icon: ChatCircleText, href: qs };
    case "QUOTATION_FILE":
    case "QUOTATION_CREATED":
    case "QUOTATION":
    default:
      return { Icon: FileText, href: qs };
  }
}

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationBell() {
  const { isSignedIn } = useUser();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => setMounted(true), []);
  const signedIn = mounted && isSignedIn;

  const refreshUnread = useCallback(async () => {
    try {
      const data = await listNotifications({ isRead: false, limit: 99 });
      setUnread(Array.isArray(data) ? data.length : 0);
    } catch {
      /* keep the last known count */
    }
  }, []);

  const load = useCallback(async (which) => {
    setLoading(true);
    setError("");
    try {
      const data = await listNotifications({ ...queryFor(which), limit: 50 });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  // fetch the unread count once signed in — live updates come over the socket
  useEffect(() => {
    if (!signedIn) {
      setItems([]);
      setUnread(0);
      return;
    }
    refreshUnread();
  }, [signedIn, refreshUnread]);

  // live: bump the count and splice new notifications straight into an open list
  useEffect(() => {
    if (!signedIn) return;
    const onNotification = (n) => {
      setUnread((c) => c + 1);
      setItems((list) => (tab === "read" ? list : [n, ...list]));
    };
    socket.on("new_notification", onNotification);
    return () => socket.off("new_notification", onNotification);
  }, [signedIn, tab]);

  // (re)load the list whenever the panel is open and the tab changes
  useEffect(() => {
    if (signedIn && open) load(tab);
  }, [signedIn, open, tab, load]);

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // click-through: close the panel, mark read, then the <Link> navigates
  const openItem = (n) => {
    setOpen(false);
    if (n.isRead) return;
    markNotificationRead(n._id).catch(() => {});
    setItems((list) =>
      tab === "unread"
        ? list.filter((x) => x._id !== n._id)
        : list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x))
    );
    setUnread((c) => Math.max(0, c - 1));
  };

  // individual delete — no confirmation, optimistic
  const removeOne = async (id) => {
    const prev = items;
    setItems((list) => list.filter((x) => x._id !== id));
    try {
      await deleteNotification(id);
      refreshUnread();
    } catch (e) {
      setError(e.message || "Could not delete");
      setItems(prev);
    }
  };

  // clear the whole tab — always behind a centered confirm
  const clearTab = async () => {
    const label =
      tab === "read"
        ? "Delete all read notifications?"
        : tab === "unread"
          ? "Delete all unread notifications?"
          : "Delete all notifications?";
    if (!(await confirm(label, "Delete"))) return;
    setBusy(true);
    setError("");
    try {
      await clearNotifications(queryFor(tab));
      setItems([]);
      refreshUnread();
    } catch (e) {
      setError(e.message || "Could not clear notifications");
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        className="relative flex items-center rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
      >
        {unread > 0 ? (
          <BellRinging size={24} className="text-white" weight="fill" />
        ) : (
          <Bell size={24} className="text-white" />
        )}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-neon px-1 text-[10px] font-extrabold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <div
        className="fixed inset-0 z-[76]"
        style={{ pointerEvents: open ? "auto" : "none" }}
        aria-hidden={!open}
        inert={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-ink/50 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-label="Notifications"
          className={`absolute right-0 top-0 flex h-full w-full max-w-[380px] flex-col bg-shell shadow-[-16px_0_48px_-16px_rgba(43,27,77,0.4)] transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <header className="border-b border-line px-5 pb-3 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-extrabold text-ink">
                  Notifications
                </p>
                <p className="text-xs text-ink-3">
                  Updates on your orders & quotes
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-canvas hover:text-ink"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                      tab === t.id
                        ? "bg-ink text-white"
                        : "bg-canvas text-ink-2 hover:bg-line"
                    }`}
                  >
                    {t.label}
                    {t.id === "unread" && unread > 0 ? ` (${unread})` : ""}
                  </button>
                ))}
              </div>
              <button
                onClick={clearTab}
                disabled={busy || items.length === 0}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-bold text-flame transition-colors hover:bg-flame-lt disabled:opacity-40"
              >
                <Trash size={13} />
                Clear
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-5 py-8 text-sm text-ink-3">Loading…</p>
            ) : error ? (
              <div className="px-5 py-8">
                <p className="text-sm font-semibold text-flame">{error}</p>
                <button
                  onClick={() => load(tab)}
                  className="mt-3 text-xs font-bold text-flame hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="grid place-items-center px-6 py-20 text-center">
                <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-canvas">
                  <Bell size={24} className="text-ink-4" />
                </span>
                <p className="font-display text-base font-extrabold text-ink">
                  {tab === "unread"
                    ? "Nothing unread"
                    : tab === "read"
                      ? "Nothing read yet"
                      : "You're all caught up"}
                </p>
                <p className="mt-1.5 max-w-[220px] text-sm text-ink-3">
                  New updates on your orders and quotations show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => {
                  const { Icon, href } = metaFor(n.type, n.referenceId);
                  return (
                    <li
                      key={n._id}
                      className={`flex items-start gap-2 border-l-2 pl-3 pr-2 ${
                        n.isRead ? "border-transparent" : "border-flame bg-flame-lt"
                      }`}
                    >
                      <Link
                        href={href}
                        onClick={(e) => {
                          // a fresh `t` makes the target page re-fetch and
                          // re-focus even when we're already on that URL
                          e.preventDefault();
                          openItem(n);
                          router.push(`${href}&t=${Date.now()}`);
                        }}
                        className="flex min-w-0 flex-1 gap-3 py-4"
                      >
                        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-canvas text-ink-2">
                          <Icon size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                                n.isRead
                                  ? "bg-canvas text-ink-4"
                                  : "bg-flame text-white"
                              }`}
                            >
                              {n.isRead ? "Read" : "Unread"}
                            </span>
                            <span className="text-[11px] font-semibold text-ink-4">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm leading-snug text-ink-2">
                            {n.message}
                          </p>
                        </div>
                      </Link>
                      <button
                        onClick={() => removeOne(n._id)}
                        aria-label="Delete notification"
                        className="mt-4 grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-canvas hover:text-flame"
                      >
                        <Trash size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {ConfirmDialog}
    </>
  );
}
