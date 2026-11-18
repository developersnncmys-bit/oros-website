import PolicyPage, { PolicySection } from "@/components/PolicyPage";

export const metadata = {
  title: "Shipping Policy — OROS",
  description:
    "Production timelines, shipping partners, delivery estimates, and charges for orders placed on OROS.",
};

export default function ShippingPolicyPage() {
  return (
    <PolicyPage title="Shipping Policy" updated="18 November 2026">
      <p>
        Every OROS product is printed to order in our Mumbai studio. The total
        time between placing an order and receiving it depends on two
        things &mdash; production and transit.
      </p>

      <PolicySection heading="Production time">
        <p>
          Most items are made and dispatched within 48 hours of order
          confirmation. Items marked with a longer lead time on the product
          page (e.g. custom, bulk, or made-to-measure) ship in the window shown
          at checkout. Large bulk orders are scheduled separately and a
          dispatch date is shared by email.
        </p>
      </PolicySection>

      <PolicySection heading="Shipping partners and delivery time">
        <p>
          Orders are shipped through Shiprocket and its network of courier
          partners. Typical in-transit times once dispatched:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Metro cities (Mumbai, Delhi, Bangalore, etc.): 2&ndash;4 working days</li>
          <li>Other cities: 4&ndash;7 working days</li>
          <li>Remote pin codes: 7&ndash;10 working days</li>
        </ul>
        <p>
          A tracking link is emailed and sent on WhatsApp the moment the parcel
          is picked up.
        </p>
      </PolicySection>

      <PolicySection heading="Shipping charges">
        <p>
          Shipping is calculated at checkout based on the delivery pin code,
          weight, and dimensions of the parcel. Orders above the free-shipping
          threshold shown at checkout ship free within India.
        </p>
      </PolicySection>

      <PolicySection heading="Serviceable area">
        <p>
          We ship across India. International shipping is handled case-by-case
          &mdash; email us for a quote.
        </p>
      </PolicySection>

      <PolicySection heading="Delays">
        <p>
          Printing is sensitive to filament availability and local weather. If
          an order will be delayed beyond the stated window, we will reach out
          with the revised date and give you the option to cancel for a full
          refund.
        </p>
      </PolicySection>

      <PolicySection heading="Contact">
        <p>
          For shipping-related questions, email{" "}
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
