import api from "@/lib/axios";

/** POST /orders -> creates an order from the cart */
export const createOrder = (body) => api.post("/orders", body);

/** GET /orders/my-orders -> current user's orders, paginated */
export const getMyOrders = (params = {}) =>
  api.get("/orders/my-orders", { params });

/** GET /orders/admin?userId= -> every order (admin) */
export const getAdminOrders = (params = {}) =>
  api.get("/orders/admin", { params });

/** POST /orders/manual -> staff/admin manual order */
export const createManualOrder = (body) => api.post("/orders/manual", body);

/** POST /orders/quotation/:quotationId -> order from an accepted quotation */
export const createQuotationOrder = (quotationId) =>
  api.post(`/orders/quotation/${quotationId}`);

/** PATCH /orders/:id/cancel -> customer cancels a STORE or QUOTATION order before production (not MANUAL) */
export const cancelOrder = (id) => api.patch(`/orders/${id}/cancel`);

/** PATCH /orders/:id/status -> admin updates any order's status */
export const updateOrderStatus = (id, status) =>
  api.patch(`/orders/${id}/status`, { status });
