"use client";

/**
 * Runs the one-time client bootstrapping that used to live in the
 * <UserProvider> / <CartProvider> shims. No context — the stores are
 * global. Renders nothing.
 */
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { socket } from "@/lib/socket";

export default function AppInit() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?._id);
  const loadMe = useAuthStore((s) => s.loadMe);
  const syncCart = useCartStore((s) => s.syncFromServer);

  // refresh the signed-in user once persist has loaded
  useEffect(() => {
    if (hydrated) loadMe();
  }, [hydrated, loadMe]);

  // pull the server-side cart whenever a token appears
  useEffect(() => {
    if (token) syncCart();
  }, [token, syncCart]);

  // live notifications: connect and join this customer's room while signed in
  useEffect(() => {
    if (!userId) return;
    const join = () => socket.emit("customer_join", userId);
    socket.on("connect", join);
    socket.connect();
    return () => {
      socket.off("connect", join);
      socket.disconnect();
    };
  }, [userId]);

  return null;
}
