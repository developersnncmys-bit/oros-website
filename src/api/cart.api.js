import api from "@/lib/axios";

/** GET /cart -> { items: [...] } (product populated) */
export const getCart = () => api.get("/cart");

/** POST /cart -> { cart } . body: { product, qty, selectedOptions?, personalisation? } */
export const addToCart = (body) => api.post("/cart", body);

/** PATCH /cart/:id -> { cart } . body: { qty } */
export const updateCartQty = (id, qty) => api.patch(`/cart/${id}`, { qty });

/** DELETE /cart/:id */
export const removeCartItem = (id) => api.delete(`/cart/${id}`);

/** DELETE /cart/clear */
export const clearCart = () => api.delete("/cart/clear");

// ── admin ──
/** GET /cart/admin -> { carts: [...] } — every customer's live cart, grouped by user */
export const getAllCarts = () => api.get("/cart/admin");
