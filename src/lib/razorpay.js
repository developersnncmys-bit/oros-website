/**
 * Razorpay checkout helper. Any order that sits at PENDING_PAYMENT — a
 * store order or one converted from an accepted quotation — is paid the
 * same way: create a gateway order, open the widget, verify the signature.
 */

import * as paymentApi from "@/api/payment.api";

const RZP_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = RZP_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * Take an order (as returned by the API) through payment. Resolves once the
 * signature is verified server-side; rejects if the widget is dismissed or
 * verification fails — the order then stays PENDING_PAYMENT for a retry.
 */
export async function payForOrder(order, prefill = {}) {
  const rzpOrder = await paymentApi.createPaymentOrder(order._id);

  const ok = await loadRazorpay();
  if (!ok) throw new Error("Could not load the payment gateway");

  await new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency || "INR",
      name: "OROS",
      description: `Order ${order._id}`,
      prefill: {
        name: prefill.name || "",
        contact: prefill.contact || "",
        email: prefill.email || "",
      },
      theme: { color: "#ff5a2c" },
      handler: async (resp) => {
        try {
          await paymentApi.verifyPayment({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    });
    rzp.open();
  });
}
