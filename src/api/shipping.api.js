import api from "@/lib/axios";

/** GET /shipping/prepare -> address + package data ready for a rate call */
export const prepareShipping = () => api.get("/shipping/prepare");

/** POST /shipping/rates -> courier rates for the prepared shipment */
export const getShippingRates = (body) => api.post("/shipping/rates", body);
