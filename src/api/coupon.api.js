import api from "@/lib/axios";

/** GET /coupons — { coupons: [...] } */
export const listCoupons = (params = { limit: 50 }) =>
  api.get("/coupons", { params });

export const getCoupon = (id) => api.get(`/coupons/${id}`);

/** POST /coupons/validate — { code, orderValue } -> { coupon, discount, finalAmount } */
export const validateCoupon = (code, orderValue) =>
  api.post("/coupons/validate", { code, orderValue });

// ── admin ──
export const createCoupon = (body) => api.post("/coupons", body);
export const updateCoupon = (id, body) => api.put(`/coupons/${id}`, body);
export const deleteCoupon = (id) => api.delete(`/coupons/${id}`);
