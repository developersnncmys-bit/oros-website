import api from "@/lib/axios";

/** GET /address -> { address } (one per user) */
export const getAddress = () => api.get("/address");

/** POST /address -> upsert the user's address */
export const saveAddress = (body) => api.post("/address", body);

/** PATCH /address -> partial update */
export const updateAddress = (body) => api.patch("/address", body);

/** DELETE /address */
export const deleteAddress = () => api.delete("/address");
