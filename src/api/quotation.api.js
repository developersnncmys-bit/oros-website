import api from "@/lib/axios";

/** GET /quotation -> caller's quotations (or all, for admin) */
export const listQuotations = (params = {}) =>
  api.get("/quotation", { params });

/** POST /quotation -> multipart: fields + files[] . type: BULK | CUSTOM */
export const createQuotation = (formData) =>
  api.post("/quotation", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/** PUT /quotation/:id -> customer update (multipart) */
export const updateQuotation = (id, formData) =>
  api.put(`/quotation/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/** PUT /quotation/:id/admin -> admin update (pricing, status) */
export const updateQuotationByAdmin = (id, body) =>
  api.put(`/quotation/${id}/admin`, body);
