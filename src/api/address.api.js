import api from "@/lib/axios";

/** GET /address -> { addresses: [...] } */
export const listAddresses = () => api.get("/address");

/** POST /address -> { address } . body is a full address */
export const createAddress = (body) => api.post("/address", body);

/** PATCH /address/:id -> { address } . body is a full address */
export const updateAddress = (id, body) => api.patch(`/address/${id}`, body);

/** PATCH /address/:id/default -> { address } */
export const setDefaultAddress = (id) =>
  api.patch(`/address/${id}/default`);

/** DELETE /address/:id */
export const deleteAddress = (id) => api.delete(`/address/${id}`);
