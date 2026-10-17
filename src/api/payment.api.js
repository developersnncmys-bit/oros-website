import api from "@/lib/axios";

/** POST /payment/create-order/:orderId -> Razorpay order */
export const createPaymentOrder = (orderId) =>
  api.post(`/payment/create-order/${orderId}`);

/** POST /payment/verify -> verifies the Razorpay signature */
export const verifyPayment = (body) => api.post("/payment/verify", body);
