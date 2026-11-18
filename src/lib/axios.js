import axios from "axios";

/**
 * One axios instance for the whole app.
 *
 * The backend answers every route with { success, message, data }. The
 * response interceptor unwraps that so callers get `data` straight back,
 * and turns a failure into an Error carrying the server's `message`.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const TOKEN_KEY = "oros.token";

export const tokenStore = {
  get() {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    if (typeof window === "undefined") return;
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
  clear() {
    this.set(null);
  },
};

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  // server renders give up instead of hanging on a sleeping backend
  // (Next keeps the last good cached page); the browser waits as before
  timeout: typeof window === "undefined" ? 30000 : 0,
});

// ── Request: attach the bearer token when we have one ──
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Heuristics for messages that look like internals leaking through
// (DB auth strings, driver exceptions, network errors). When any match,
// we swap for a friendly message so shoppers never see "bad auth :
// authentication failed" and similar.
const TECHNICAL_PATTERNS = [
  /bad auth/i,
  /authentication failed/i,
  /\bmongo/i,
  /mongoose/i,
  /ECONNREFUSED/,
  /ENOTFOUND/,
  /ETIMEDOUT/,
  /EAI_AGAIN/,
  /ECONNRESET/,
  /\batlas\b/i,
  /\bcluster\b/i,
  /ObjectId/,
  /ValidationError:/,
  /CastError:/,
  /SyntaxError:/,
  /TypeError:/,
  /\bE11000\b/,
  /\bnetwork error\b/i,
];

const friendlyFallback = (status) => {
  if (status === 401 || status === 403)
    return "Please sign in to continue.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status === 429)
    return "Too many requests. Please wait a moment and try again.";
  if (status >= 500 || !status)
    return "Our server is having trouble right now. Please try again in a moment.";
  return "Something went wrong. Please try again.";
};

const sanitizeMessage = (status, raw) => {
  if (!raw || typeof raw !== "string") return friendlyFallback(status);
  if (TECHNICAL_PATTERNS.some((re) => re.test(raw)))
    return friendlyFallback(status);
  return raw;
};

// ── Response: unwrap `data`, surface server messages, handle 401 ──
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && "data" in body) {
      return body.data;
    }
    return body;
  },
  (error) => {
    const status = error.response?.status;
    const rawMessage =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";

    if (status === 401 && typeof window !== "undefined") {
      tokenStore.clear();
      // let the auth store drop the stale session…
      window.dispatchEvent(new CustomEvent("oros:unauthorized"));
      // …and prompt a fresh login (e.g. "Please login to add products to cart")
      window.dispatchEvent(new CustomEvent("oros:require-auth"));
    }

    const err = new Error(sanitizeMessage(status, rawMessage));
    err.status = status;
    err.payload = error.response?.data;
    return Promise.reject(err);
  }
);

export default api;
