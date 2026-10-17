import api from "@/lib/axios";

/** GET /category — { category: [...] } (paginated: page, limit) */
export const listCategories = (params = { limit: 100 }) =>
  api.get("/category", { params });

// ── admin ──
export const createCategory = (formData) =>
  api.post("/category", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateCategory = (id, formData) =>
  api.put(`/category/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteCategory = (id) => api.delete(`/category/${id}`);
