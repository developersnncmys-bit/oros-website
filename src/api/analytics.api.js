import api from "@/lib/axios";

/** All analytics routes accept ?from=YYYY-MM-DD&to=YYYY-MM-DD */
export const getDashboard = (params = {}) =>
  api.get("/analytics/dashboard", { params });
export const getOverview = (params = {}) =>
  api.get("/analytics/overview", { params });
export const getSalesTrend = (params = {}) =>
  api.get("/analytics/sales-trend", { params });
export const getTopProducts = (params = {}) =>
  api.get("/analytics/top-products", { params });
export const getTopCategories = (params = {}) =>
  api.get("/analytics/top-categories", { params });
export const getTopCustomers = (params = {}) =>
  api.get("/analytics/top-customers", { params });
export const getOrderBreakdown = (params = {}) =>
  api.get("/analytics/order-breakdown", { params });
export const getQuotationAnalytics = (params = {}) =>
  api.get("/analytics/quotations", { params });
export const getNonMovingProducts = (params = {}) =>
  api.get("/analytics/non-moving-products", { params });

/**
 * GET /analytics/product-time-analytics — time visitors spend on each PDP,
 * sorted by total time desc. Rows:
 * { productId, productImage, productName, sku, totalDuration, totalviews, averageDuration }
 * (seconds). Not date-filtered — it's an all-time roll-up.
 * Paginated: params { page = 1, limit = 10 }. Response carries no grand
 * total, so page with `hasNext = rows.length === limit`.
 */
export const getProductTimeAnalytics = (params = {}) =>
  api.get("/analytics/product-time-analytics", { params });
