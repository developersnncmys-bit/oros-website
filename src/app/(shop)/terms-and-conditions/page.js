import PolicyPage, { PolicySection } from "@/components/PolicyPage";

export const metadata = {
  title: "Terms & Conditions — OROS",
  description:
    "The terms that govern your use of the OROS website and the orders you place with us.",
};

export default function TermsPage() {
  return (
    <PolicyPage title="Terms & Conditions" updated="18 November 2026">
      <p>
        These Terms govern your use of the OROS website and any orders you
        place through it. By using the site or placing an order, you agree to
        these Terms.
      </p>

      <PolicySection heading="About us">
        <p>
          OROS is operated by OROS Enterprises, an additive manufacturing
          studio based in Mumbai, India. Contact:{" "}
          <a className="text-flame underline" href="mailto:orosent@yahoo.com">
            orosent@yahoo.com
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection heading="Products and pricing">
        <p>
          Product details, dimensions, and colours shown on the site are
          representative; small variations are inherent to 3D printing and are
          not defects. Prices are in Indian Rupees (INR) and include applicable
          GST unless stated otherwise. We reserve the right to correct pricing
          errors and refuse or cancel any order resulting from such an error
          (with a full refund).
        </p>
      </PolicySection>

      <PolicySection heading="Orders and payment">
        <p>
          An order is confirmed only when payment is received. Payments are
          processed by Razorpay; by paying you also agree to their terms of
          service. We may decline an order for reasons including suspected
          fraud, unserviceable location, or stock constraints &mdash; in which
          case the amount is refunded in full.
        </p>
      </PolicySection>

      <PolicySection heading="Shipping, returns and refunds">
        <p>
          Shipping timelines, serviceable areas, and return eligibility are set
          out in our{" "}
          <a className="text-flame underline" href="/shipping-policy">
            Shipping Policy
          </a>{" "}
          and{" "}
          <a className="text-flame underline" href="/refund-policy">
            Refund &amp; Cancellation Policy
          </a>
          , which form part of these Terms.
        </p>
      </PolicySection>

      <PolicySection heading="Custom and bulk orders">
        <p>
          Custom and bulk orders are quoted and confirmed separately. Once
          production begins on a custom or bulk order, it cannot be cancelled
          or returned except in the case of a manufacturing defect.
        </p>
      </PolicySection>

      <PolicySection heading="Intellectual property">
        <p>
          All original designs, product photography, copy, and branding on this
          site are the property of OROS Enterprises. You may not reproduce,
          resell, or use them commercially without written permission. When you
          upload a design for a custom order, you confirm that you own the
          rights to it.
        </p>
      </PolicySection>

      <PolicySection heading="Limitation of liability">
        <p>
          To the extent permitted by law, OROS&rsquo;s liability for any claim
          relating to an order is limited to the amount you paid for that
          order. We are not liable for indirect or consequential losses.
        </p>
      </PolicySection>

      <PolicySection heading="Governing law">
        <p>
          These Terms are governed by the laws of India. Any dispute shall be
          subject to the exclusive jurisdiction of the courts of Mumbai,
          Maharashtra.
        </p>
      </PolicySection>

      <PolicySection heading="Changes">
        <p>
          We may update these Terms from time to time. The version in force is
          the one published here, with the &ldquo;last updated&rdquo; date
          above.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
