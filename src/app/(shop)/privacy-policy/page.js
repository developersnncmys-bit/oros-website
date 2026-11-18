import PolicyPage, { PolicySection } from "@/components/PolicyPage";

export const metadata = {
  title: "Privacy Policy — OROS",
  description:
    "How OROS collects, uses, and protects the personal information you share with us.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage title="Privacy Policy" updated="18 November 2026">
      <p>
        This Privacy Policy describes how OROS Enterprises (&ldquo;OROS&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and protects the
        personal information you share with us when you visit or place an order
        on this website.
      </p>

      <PolicySection heading="Information we collect">
        <p>
          We collect information you provide directly &mdash; name, phone
          number, email address, billing and shipping address &mdash; when you
          create an account, place an order, or contact us. We also collect
          limited technical information (device, browser, IP) through standard
          server logs and cookies to keep the site working.
        </p>
      </PolicySection>

      <PolicySection heading="How we use your information">
        <p>
          Your information is used to process and ship your orders, respond to
          enquiries, send order-related communication, and improve the service.
          We do not sell your personal information.
        </p>
      </PolicySection>

      <PolicySection heading="Sharing with third parties">
        <p>
          We share only what is necessary with service providers who help us
          run the business &mdash; Razorpay for payments, Shiprocket and
          delivery partners for shipping, Cloudinary for media hosting. Each
          provider operates under its own privacy policy.
        </p>
      </PolicySection>

      <PolicySection heading="Data retention">
        <p>
          Order and billing records are retained for the period required under
          Indian tax and consumer-protection law. Marketing data is retained
          until you unsubscribe or ask us to delete it.
        </p>
      </PolicySection>

      <PolicySection heading="Your rights">
        <p>
          You can request a copy of the information we hold about you, ask us
          to correct it, or ask us to delete it where we are not required to
          retain it by law. Write to{" "}
          <a className="text-flame underline" href="mailto:orosent@yahoo.com">
            orosent@yahoo.com
          </a>{" "}
          from the email address associated with your account.
        </p>
      </PolicySection>

      <PolicySection heading="Contact">
        <p>
          Questions about this policy? Email{" "}
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
