import api from "@/lib/axios";

/** GET /product — paginated list. query: { page, limit, search, category, subcategory, status, sort, minPrice, maxPrice } */
export const listProducts = (params = {}) =>
  api.get("/product", { params });

/** GET /product/:id — full PDP payload: { product, specs, media, options, priceSlabs } */
export const getProduct = (id) => api.get(`/product/${id}`);

/** GET /product/best-sellers — { products } */
export const listBestSellers = (params = {}) =>
  api.get("/product/best-sellers", { params });

/** GET /product/:id/suggestions — { products } */
export const listSuggestedProducts = (id, params = {}) =>
  api.get(`/product/${id}/suggestions`, { params });

// ── product CRUD ──
export const createProduct = (body) => api.post("/product", body);
export const updateProduct = (id, body) => api.put(`/product/${id}`, body);
export const deleteProduct = (id) => api.delete(`/product/${id}`);

// ── specs ──
export const getProductSpecs = (productId) =>
  api.get(`/product/${productId}/specs`);
export const createSpec = (productId, body) =>
  api.post(`/product/${productId}/specs`, body);
export const updateSpec = (productId, specId, body) =>
  api.put(`/product/${productId}/specs/${specId}`, body);
export const deleteSpec = (productId, specId) =>
  api.delete(`/product/${productId}/specs/${specId}`);

// ── options ──
export const getProductOptions = (productId) =>
  api.get(`/product/${productId}/options`);
export const createOption = (productId, body) =>
  api.post(`/product/${productId}/options`, body);
export const updateOption = (productId, optionId, body) =>
  api.put(`/product/${productId}/options/${optionId}`, body);
export const deleteOption = (productId, optionId) =>
  api.delete(`/product/${productId}/options/${optionId}`);

// ── option values ──
export const getOptionValues = (optionId) =>
  api.get(`/product/options/${optionId}/values`);
export const createOptionValue = (optionId, body) =>
  api.post(`/product/options/${optionId}/values`, body);
export const updateOptionValue = (optionId, valueId, body) =>
  api.put(`/product/options/${optionId}/values/${valueId}`, body);
export const deleteOptionValue = (optionId, valueId) =>
  api.delete(`/product/options/${optionId}/values/${valueId}`);

// ── price slabs ──
export const getPriceSlabs = (productId) =>
  api.get(`/product/${productId}/price-slabs`);
export const createPriceSlab = (productId, body) =>
  api.post(`/product/${productId}/price-slabs`, body);
export const updatePriceSlab = (productId, slabId, body) =>
  api.put(`/product/${productId}/price-slabs/${slabId}`, body);
export const deletePriceSlab = (productId, slabId) =>
  api.delete(`/product/${productId}/price-slabs/${slabId}`);

// ── media ──
export const getProductMedia = (productId) =>
  api.get(`/product/${productId}/media`);
export const createMedia = (productId, formData) =>
  api.post(`/product/${productId}/media`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateMedia = (productId, mediaId, body) =>
  api.put(`/product/${productId}/media/${mediaId}`, body);
export const deleteMedia = (productId, mediaId) =>
  api.delete(`/product/${productId}/media/${mediaId}`);

// ── shipping (weight/dimensions used to pack orders) ──
export const listAllProductShipping = () => api.get("/product/shipping");
export const getProductShipping = (productId) =>
  api.get("/product/shipping", { params: { productId } });
export const createProductShipping = (productId, body) =>
  api.post("/product/shipping", body, { params: { productId } });
export const updateProductShipping = (id, body) =>
  api.patch(`/product/shipping/${id}`, body);
export const deleteProductShipping = (id) =>
  api.delete(`/product/shipping/${id}`);

// ── bulk ──
export const downloadImportTemplate = () =>
  api.get("/product/bulk-template", { responseType: "blob" });
export const bulkImportProducts = (formData) =>
  api.post("/product/bulk-import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
