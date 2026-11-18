import PolicyPage, { PolicySection } from "@/components/PolicyPage";

export const metadata = {
  title: "Refund & Cancellation Policy — OROS",
  description:
    "Our cancellation window, return eligibility, and how refunds are processed for OROS orders.",
};

export default function RefundPolicyPage() {
  return (
    <PolicyPage title="Refund & Cancellation Policy" updated="18 November 2026">
      <p>
        Because every OROS item is printed on demand, our policy balances your
        peace of mind with the reality that production begins soon after you
        pay. Please read this carefully before placing an order.
      </p>

      <PolicySection heading="Cancellations">
        <p>
          Orders can be cancelled for a full refund any time before production
          begins &mdash; typically within 2 hours of placing the order. Once
          printing has started, cancellation is no longer possible. For
          customised items (your name, logo, or bespoke design) printing may
          start sooner; those orders become non-cancellable at confirmation.
        </p>
      </PolicySection>

      <PolicySection heading="Returns and refunds">
        <p>
          We accept returns within 7 days of delivery only in the following
          cases:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>The item arrived damaged or defective</li>
          <li>The wrong item was shipped</li>
          <li>The item does not match what was shown on the product page</li>
        </ul>
        <p>
          To start a return, email{" "}
          <a className="text-flame underline" href="mailto:orosent@yahoo.com">
            orosent@yahoo.com
          </a>{" "}
          within 7 days of delivery with your order number and a clear photo or
          short video of the issue. We&rsquo;ll arrange a reverse pickup at our
          cost where serviceable, and a replacement or refund once the item is
          back with us.
        </p>
        <p>
          Customised products, bulk orders, and items damaged after delivery
          are not eligible for return.
        </p>
      </PolicySection>

      <PolicySection heading="How refunds are processed">
        <p>
          Approved refunds are issued through Razorpay to the original payment
          method within 5&ndash;7 working days of the item being received or the
          cancellation being confirmed. Your bank may take an additional
          2&ndash;4 working days to reflect the credit.
        </p>
      </PolicySection>

      <PolicySection heading="Contact">
        <p>
          Email{" "}
          <a className="text-flame underline" href="mailto:orosent@yahoo.com">
            orosent@yahoo.com
          </a>{" "}
          or message us on WhatsApp at{" "}
          <a
            className="text-flame underline"
            href="https://wa.me/918369685209"
            target="_blank"
            rel="noopener noreferrer"
          >
            +91 83696 85209
          </a>
          .
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
