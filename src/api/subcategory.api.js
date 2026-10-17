import api from "@/lib/axios";

/** GET /subCategory — { subCategory: [...] }. query: { category, page, limit } */
export const listSubcategories = (params = { limit: 200 }) =>
  api.get("/subCategory", { params });

// ── admin ──
export const createSubcategory = (formData) =>
  api.post("/subCategory", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateSubcategory = (id, formData) =>
  api.put(`/subCategory/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteSubcategory = (id) => api.delete(`/subCategory/${id}`);
