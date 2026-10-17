"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  UserCircle,
  CaretDown,
  SignOut,
  SquaresFour,
  Package,
  PencilSimple,
  FileText,
  X,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useUser, useAuthStore } from "@/store/authStore";
import OtpInput from "@/components/OtpInput";
import { useConfirm } from "@/components/ConfirmDialog";

const CLEAN_PHONE = (v) => v.replace(/\D/g, "").slice(0, 10);

export default function ProfileMenu() {
  const { isSignedIn, user, firstName, initial, greeting } = useUser();
  const { confirm, ConfirmDialog } = useConfirm();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // server + first client render always show "Login"; flip after mount
  const signedIn = mounted && isSignedIn;
  const requestLoginOtp = useAuthStore((s) => s.requestLoginOtp);
  const verifyLoginOtp = useAuthStore((s) => s.verifyLoginOtp);
  const requestRegisterOtp = useAuthStore((s) => s.requestRegisterOtp);
  const verifyRegisterOtp = useAuthStore((s) => s.verifyRegisterOtp);
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const registerWithPassword = useAuthStore((s) => s.registerWithPassword);
  const logout = useAuthStore((s) => s.logout);
  const loading = useAuthStore((s) => s.loading);

  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState("login"); // login | register
  const [method, setMethod] = useState("otp"); // otp | password
  const [step, setStep] = useState("phone"); // phone | otp (only used in otp method)
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const greetRef = useRef(null);

  // open the modal when something else asks for auth (e.g. add-to-cart)
  useEffect(() => {
    const onReq = () => {
      setModalOpen(true);
      setStep("phone");
      setErr("");
    };
    window.addEventListener("oros:require-auth", onReq);
    return () => window.removeEventListener("oros:require-auth", onReq);
  }, []);

  // a signed-in non-customer (admin / staff) tried to use the cart
  useEffect(() => {
    let timer;
    const onBlocked = (e) => {
      setNotice(
        e.detail?.message || "Cart is for customer accounts only."
      );
      clearTimeout(timer);
      timer = setTimeout(() => setNotice(""), 4000);
    };
    window.addEventListener("oros:require-customer", onBlocked);
    return () => {
      window.removeEventListener("oros:require-customer", onBlocked);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    // The slide-over below carries its own backdrop and close button for
    // pointer dismissal. A document-level mousedown listener here would also
    // fire for the panel's own buttons (they render outside this wrapper),
    // closing the menu on mousedown so the follow-up click — e.g. "Sign out"
    // — never lands. Escape is all we add.
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useGSAP(
    () => {
      if (!signedIn || !greetRef.current || prefersReducedMotion()) return;
      gsap.fromTo(
        greetRef.current,
        { autoAlpha: 0, x: 10 },
        { autoAlpha: 1, x: 0, duration: 0.6, ease: "expo.out" }
      );
    },
    { dependencies: [signedIn, firstName] }
  );

  const reset = () => {
    setStep("phone");
    setPhone("");
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setOtp("");
    setErr("");
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email.trim()) return setErr("Enter your email");
    if (!password || password.length < 6)
      return setErr("Password must be at least 6 characters");
    try {
      if (mode === "register") {
        if (!name.trim()) return setErr("Enter your name");
        await registerWithPassword({
          name: name.trim(),
          email: email.trim(),
          phone: phone ? phone : undefined,
          password,
        });
      } else {
        await loginWithPassword({ email: email.trim(), password });
      }
      setModalOpen(false);
      reset();
    } catch (e) {
      setErr(e.message);
    }
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    setErr("");
    if (phone.length !== 10) return setErr("Enter a valid 10-digit number");
    try {
      if (mode === "register") {
        if (!name.trim() || !email.trim())
          return setErr("Name and email are required");
        await requestRegisterOtp({ name: name.trim(), email: email.trim(), phone });
      } else {
        await requestLoginOtp(phone);
      }
      setStep("otp");
    } catch (e) {
      setErr(e.message);
    }
  };

  const confirmOtp = async (e, code) => {
    e?.preventDefault?.();
    setErr("");
    const otpValue = code || otp;
    if (otpValue.length < 6) return setErr("Enter the 6-digit code");
    try {
      if (mode === "register") {
        await verifyRegisterOtp({
          name: name.trim(),
          email: email.trim(),
          phone,
          otp: otpValue,
        });
        // registration verified — now the login OTP was sent, verify it too
        await verifyLoginOtp(phone, otpValue);
      } else {
        await verifyLoginOtp(phone, otpValue);
      }
      setModalOpen(false);
      reset();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <>
      {notice && (
        <div className="fixed left-1/2 top-4 z-[95] -translate-x-1/2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-2xl">
          {notice}
        </div>
      )}
      <div className="relative">
        {signedIn ? (
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-neon/50 text-neon-2">
              {user?.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt={firstName}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              ) : initial ? (
                <span className="text-sm font-bold">{initial}</span>
              ) : (
                <UserCircle size={20} />
              )}
            </span>
            <span ref={greetRef} className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-bold text-white">
                Hey {firstName}
              </span>
              <span className="block text-[11px] font-medium text-white/50">
                {greeting}
              </span>
            </span>
            <CaretDown
              size={13}
              className={`hidden text-white/45 transition-transform duration-300 sm:block ${
                menuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        ) : (
          <button
            onClick={() => {
              setMode("login");
              reset();
              setModalOpen(true);
            }}
            className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-neon/50 text-neon-2">
              <UserCircle size={20} />
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-bold text-white">Login</span>
              <span className="block text-[11px] text-white/50">Your account</span>
            </span>
          </button>
        )}

      </div>

      {/* ── Account slide-over (right) ── */}
      {signedIn && (
        <div
          className="fixed inset-0 z-[75]"
          style={{ pointerEvents: menuOpen ? "auto" : "none" }}
          aria-hidden={!menuOpen}
          inert={!menuOpen}
        >
          <div
            onClick={() => setMenuOpen(false)}
            className={`absolute inset-0 bg-ink/50 backdrop-blur-[2px] transition-opacity duration-300 ${
              menuOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          <aside
            role="dialog"
            aria-label="Your account"
            className={`absolute right-0 top-0 flex h-[100dvh] w-full max-w-[360px] flex-col overflow-y-auto bg-shell shadow-[-16px_0_48px_-16px_rgba(43,27,77,0.4)] transition-transform duration-300 ease-out ${
              menuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-shell px-5 py-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-canvas text-ink">
                {user?.profileImage ? (
                  <Image
                    src={user.profileImage}
                    alt={firstName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : initial ? (
                  <span className="font-display text-lg font-extrabold">
                    {initial}
                  </span>
                ) : (
                  <UserCircle size={26} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-extrabold text-ink">
                  {user?.name || firstName}
                </p>
                <p className="truncate text-xs text-ink-3">
                  {user?.phone || user?.email}
                </p>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-canvas hover:text-ink"
              >
                <X size={18} weight="bold" />
              </button>
            </header>

            <nav className="flex-1 p-3">
              {[
                { href: "/account", label: "Dashboard", icon: SquaresFour },
                {
                  href: "/account?tab=orders",
                  label: "My orders",
                  icon: Package,
                },
                {
                  href: "/account?tab=quotations",
                  label: "My quotations",
                  icon: FileText,
                },
                {
                  href: "/account?tab=profile",
                  label: "Edit profile",
                  icon: PencilSimple,
                },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-ink-2 transition-colors hover:bg-canvas hover:text-ink"
                >
                  <Icon size={17} />
                  {label}
                </Link>
              ))}
            </nav>

            <div className="sticky bottom-0 border-t border-line bg-shell p-3">
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  if (!(await confirm("Sign out of your account?", "Sign out")))
                    return;
                  logout();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-flame transition-colors hover:bg-flame-lt"
              >
                <SignOut size={17} />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-ink/50 p-4 backdrop-blur-[2px]"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Sign in"
            className="w-full max-w-sm rounded-2xl bg-shell p-6 shadow-2xl"
          >
            <h2 className="font-display text-xl font-extrabold text-ink">
              {step === "otp"
                ? "Enter the code"
                : mode === "register"
                  ? "Create your account"
                  : "Welcome back"}
            </h2>
            <p className="mt-1.5 text-sm text-ink-3">
              {step === "otp"
                ? `We sent a 6-digit code to +91 ${phone}`
                : method === "password"
                  ? mode === "register"
                    ? "Sign up with your email and a password."
                    : "Sign in with your email and password."
                  : "We'll text you a one-time code — no password."}
            </p>

            {/* method tabs — hidden during the OTP code-entry step */}
            {step !== "otp" && (
              <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-line bg-canvas p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMethod("otp");
                    setErr("");
                  }}
                  className={`rounded-md py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                    method === "otp"
                      ? "bg-shell text-ink shadow-sm"
                      : "text-ink-3 hover:text-ink"
                  }`}
                >
                  Phone OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod("password");
                    setErr("");
                  }}
                  className={`rounded-md py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                    method === "password"
                      ? "bg-shell text-ink shadow-sm"
                      : "text-ink-3 hover:text-ink"
                  }`}
                >
                  Email + Password
                </button>
              </div>
            )}

            {step === "otp" ? (
              <form onSubmit={confirmOtp} className="mt-5 space-y-4">
                <OtpInput
                  value={otp}
                  onChange={(v) => {
                    setOtp(v);
                    setErr("");
                  }}
                  onComplete={(v) => confirmOtp(undefined, v)}
                />

                {err && (
                  <p className="text-center text-xs font-semibold text-flame">
                    {err}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-flame py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-60"
                >
                  {loading ? "Verifying…" : "Verify & continue"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setErr("");
                  }}
                  className="w-full text-center text-xs font-bold text-ink-3 hover:text-ink"
                >
                  ← Change number
                </button>
              </form>
            ) : method === "password" ? (
              <form onSubmit={submitPassword} className="mt-5 space-y-3">
                {mode === "register" && (
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="h-11 w-full rounded-lg border border-line px-3.5 text-sm text-ink outline-none focus:border-flame"
                  />
                )}
                <input
                  required
                  type="email"
                  autoFocus={mode === "login"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="h-11 w-full rounded-lg border border-line px-3.5 text-sm text-ink outline-none focus:border-flame"
                />
                <div className="flex h-11 items-center rounded-lg border border-line pr-2 focus-within:border-flame">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "register" ? "Create password (min 6 chars)" : "Password"
                    }
                    minLength={6}
                    className="h-full flex-1 rounded-l-lg bg-transparent px-3.5 text-sm text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:text-ink"
                  >
                    {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === "register" && (
                  <div className="flex h-11 items-center rounded-lg border border-line px-3.5 focus-within:border-flame">
                    <span className="text-sm font-semibold text-ink-3">+91</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(CLEAN_PHONE(e.target.value))}
                      inputMode="numeric"
                      placeholder="Phone (optional)"
                      className="ml-2 h-full flex-1 bg-transparent text-sm text-ink outline-none"
                    />
                  </div>
                )}

                {err && <p className="text-xs font-semibold text-flame">{err}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-flame py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-60"
                >
                  {loading
                    ? mode === "register"
                      ? "Creating…"
                      : "Signing in…"
                    : mode === "register"
                      ? "Create account"
                      : "Sign in"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setErr("");
                  }}
                  className="w-full text-center text-xs font-bold text-flame hover:underline"
                >
                  {mode === "login"
                    ? "New here? Create an account"
                    : "Already have an account? Sign in"}
                </button>
              </form>
            ) : (
              <form onSubmit={sendOtp} className="mt-5 space-y-3">
                {mode === "register" && (
                  <>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      className="h-11 w-full rounded-lg border border-line px-3.5 text-sm text-ink outline-none focus:border-flame"
                    />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="h-11 w-full rounded-lg border border-line px-3.5 text-sm text-ink outline-none focus:border-flame"
                    />
                  </>
                )}
                <div className="flex h-11 items-center rounded-lg border border-line px-3.5 focus-within:border-flame">
                  <span className="text-sm font-semibold text-ink-3">+91</span>
                  <input
                    autoFocus
                    value={phone}
                    onChange={(e) => setPhone(CLEAN_PHONE(e.target.value))}
                    inputMode="numeric"
                    placeholder="9876543210"
                    className="ml-2 h-full flex-1 bg-transparent text-sm text-ink outline-none"
                  />
                </div>

                {err && <p className="text-xs font-semibold text-flame">{err}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-flame py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-flame-dk disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setErr("");
                  }}
                  className="w-full text-center text-xs font-bold text-flame hover:underline"
                >
                  {mode === "login"
                    ? "New here? Create an account"
                    : "Already have an account? Login"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {ConfirmDialog}
    </>
  );
}
