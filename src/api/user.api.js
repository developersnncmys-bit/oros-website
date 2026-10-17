import api from "@/lib/axios";

/** GET /user/profile -> { user } (customer's own profile) */
export const getProfile = () => api.get("/user/profile");

/** PATCH /user/profile -> multipart { name, email, profileImage? } */
export const updateProfile = (formData) =>
  api.patch("/user/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// ── admin ──
export const listUsers = (params = {}) => api.get("/user", { params });
export const createUser = (body) => api.post("/user/create", body);
export const updateUser = (id, body) => api.put(`/user/update/${id}`, body);
export const deleteUser = (id) => api.delete(`/user/${id}`);
