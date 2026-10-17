import api from "@/lib/axios";

/** GET /Banner — { banners: [...] }. query: { type: SLIDER|SHOWREEL, isActive } */
export const listBanners = (params = {}) =>
  api.get("/Banner", { params });

// ── admin ──
export const createBanner = (formData) =>
  api.post("/Banner", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateBanner = (id, formData) =>
  api.put(`/Banner/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteBanner = (id) => api.delete(`/Banner/${id}`);
