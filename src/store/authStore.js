"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as authApi from "@/api/auth.api";
import { tokenStore } from "@/lib/axios";
import { useCartStore } from "@/store/cartStore";

/** Time-of-day greeting, computed on the client only. */
export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      hydrated: false,
      loading: false,
      error: null,

      // ── phone + OTP (storefront) ──
      requestLoginOtp: async (phone) => {
        set({ loading: true, error: null });
        try {
          await authApi.login(phone);
          set({ loading: false });
          return true;
        } catch (e) {
          set({ loading: false, error: e.message });
          throw e;
        }
      },

      requestRegisterOtp: async (body) => {
        set({ loading: true, error: null });
        try {
          await authApi.register(body);
          set({ loading: false });
          return true;
        } catch (e) {
          set({ loading: false, error: e.message });
          throw e;
        }
      },

      verifyLoginOtp: async (phone, otp) => {
        set({ loading: true, error: null });
        try {
          const data = await authApi.verifyLoginOtp({ phone, otp });
          // this storefront is customer-only — admin/staff accounts log in
          // through the separate admin frontend instead
          if (data.user?.role !== "user") {
            throw new Error(
              "This login is for customer accounts only. Admins and staff should use the admin panel."
            );
          }
          tokenStore.set(data.token);
          set({ user: data.user, token: data.token, loading: false });
          try { useCartStore.getState().flushPendingAdd(); } catch {}
          return data.user;
        } catch (e) {
          set({ loading: false, error: e.message });
          throw e;
        }
      },

      verifyRegisterOtp: async (body) => {
        set({ loading: true, error: null });
        try {
          // register verify returns { user } but no token — log in right after
          await authApi.verifyRegisterOtp(body);
          await authApi.login(body.phone);
          set({ loading: false });
          return true;
        } catch (e) {
          set({ loading: false, error: e.message });
          throw e;
        }
      },

      // ── email + password (storefront) ──
      loginWithPassword: async ({ email, password }) => {
        set({ loading: true, error: null });
        try {
          const data = await authApi.loginWithPassword({ email, password });
          if (data.user?.role !== "user") {
            throw new Error(
              "This login is for customer accounts only. Admins and staff should use the admin panel."
            );
          }
          tokenStore.set(data.token);
          set({ user: data.user, token: data.token, loading: false });
          try { useCartStore.getState().flushPendingAdd(); } catch {}
          return data.user;
        } catch (e) {
          set({ loading: false, error: e.message });
          throw e;
        }
      },

      registerWithPassword: async ({ name, email, phone, password }) => {
        set({ loading: true, error: null });
        try {
          const data = await authApi.registerWithPassword({ name, email, phone, password });
          tokenStore.set(data.token);
          set({ user: data.user, token: data.token, loading: false });
          try { useCartStore.getState().flushPendingAdd(); } catch {}
          return data.user;
        } catch (e) {
          set({ loading: false, error: e.message });
          throw e;
        }
      },

      loadMe: async () => {
        if (!tokenStore.get()) return null;
        try {
          const data = await authApi.getMe();
          // this storefront is customer-only — a stale admin/staff session
          // (e.g. from before this check existed) gets signed out here
          if (data.user?.role !== "user") {
            get().logout();
            return null;
          }
          // /me returns a trimmed user ({_id,name,email,role}); keep the
          // richer fields (phone, profileImage) from the login response
          set((s) => ({ user: { ...s.user, ...data.user } }));
          return get().user;
        } catch {
          return get().user;
        }
      },

      setUser: (user) => set({ user }),

      logout: () => {
        tokenStore.clear();
        set({ user: null, token: null });
        // the cart is customer-scoped — drop it on the way out
        try {
          useCartStore.setState({ lines: [], drawerOpen: false });
        } catch {}
      },
    }),
    {
      name: "oros.auth",
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) tokenStore.set(state.token);
      },
    }
  )
);

// flip `hydrated` once persist has finished loading from localStorage
if (typeof window !== "undefined") {
  const done = () => useAuthStore.setState({ hydrated: true });
  if (useAuthStore.persist?.hasHydrated?.()) done();
  useAuthStore.persist?.onFinishHydration?.(done);
  // hard fallback so the UI never gets stuck showing "Login"
  setTimeout(done, 0);
}

// keep the store honest if a 401 clears the token from under it
if (typeof window !== "undefined") {
  window.addEventListener("oros:unauthorized", () => {
    useAuthStore.setState({ user: null, token: null });
    try {
      useCartStore.setState({ lines: [], drawerOpen: false });
    } catch {}
  });
}

/** Compatibility hook — same surface the old UserContext exposed. */
export function useUser() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);

  const firstName = user?.name?.split(" ")[0] || "";
  const role = user?.role || null;
  return {
    profile: user,
    user,
    hydrated,
    // a token in storage OR a user object both mean "signed in"
    isSignedIn: !!user,
    role,
    // storefront customer — the only role the cart / checkout serve
    isCustomer: role === "user",
    firstName,
    initial: firstName.charAt(0).toUpperCase(),
    greeting: greetingFor(),
    signOut: logout,
  };
}
