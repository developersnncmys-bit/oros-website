import Link from "next/link";
import Image from "next/image";
import {
  Palette,
  Printer,
  Cube,
  Factory,
  EnvelopeSimple,
  WhatsappLogo,
} from "@phosphor-icons/react/ssr";
import { fetchCategories, fetchProducts } from "@/lib/catalog";
import FooterCategories from "@/components/FooterCategories";

export const dynamic = "force-dynamic";

export default async function Footer() {
  const [categories, pool] = await Promise.all([
    fetchCategories(),
    fetchProducts({ limit: 1 }),
  ]);
  const productCount = pool.pagination?.total || 0;

  const FACTS = [
    { icon: Cube, value: "Original Designs", label: "Thoughtfully designed products" },
    { icon: Printer, value: "Precision 3D Printing", label: "Made with care and attention to detail" },
    { icon: Palette, value: "Personalised Creations", label: "Your choice of colours and finishes" },
    { icon: Factory, value: "Custom Manufacturing", label: "Bringing your ideas to life" },
  ];

  return (
    <footer className="mt-6 bg-night text-white">
      {/* Matches the header's wash so the page is bookended by the same
          chrome instead of three different dark surfaces. */}
      <div
        aria-hidden="true"
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(to right, transparent, #a855f7aa 30%, #a855f7aa 70%, transparent)",
        }}
      />

      <div className="mx-auto max-w-[1600px] px-4 lg:px-8">
        {/* ══ Facts ══ */}
        <ul className="grid gap-6 border-b border-white/10 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map(({ icon: Icon, value, label }) => (
            <li key={label} className="flex items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neon/30 bg-night-2">
                <Icon size={19} className="text-neon-2" />
              </span>
              <span>
                <span className="block font-display text-lg font-extrabold leading-none">
                  {value}
                </span>
                <span className="mt-1 block text-sm text-white/75">{label}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* ══ Body ══ */}
        <div className="grid items-start gap-10 py-12 lg:grid-cols-[1.5fr_1fr_1.3fr] lg:gap-16">
          {/* ── Studio ── */}
          <div>
            <Link href="/" aria-label="OROS — home" className="inline-block">
              <Image
                src="/brand/oros-footer-logo.png"
                alt="OROS"
                width={150}
                height={100}
                className="h-40 w-40 object-contain object-left lg:h-48 lg:w-48"
              />
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">
              OROS is an additive manufacturing studio based in Mumbai, bringing ideas to life through 3D printing. From original designs to custom creations, we focus on quality, precision, and creativity. Every product on this site is printed after you order it.
            </p>
          </div>

          {/* ── Shop: every link here resolves to a real page ── */}
          <nav>
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
              Shop
            </h3>
            <FooterCategories
              categories={categories}
              productCount={productCount}
            />
          </nav>

          {/* ── Address ── */}
          <div>
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
              Contact Us
            </h3>
            <address className="space-y-3 text-sm not-italic">
              <div className="flex items-center gap-2.5">
                <WhatsappLogo size={15} className="shrink-0 text-white/35" />
                <a
                  href="https://wa.me/918369685209"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 transition-colors hover:text-neon-2"
                >
                  +91 83696 85209
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <EnvelopeSimple size={15} className="shrink-0 text-white/35" />
                <a
                  href="mailto:orosent@yahoo.com"
                  className="text-white/70 transition-colors hover:text-neon-2"
                >
                  orosent@yahoo.com
                </a>
              </div>
            </address>
          </div>
        </div>

        {/* ══ Bottom ══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-6">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} OROS Enterprises. All Rights Reserved.
          </p>
          <span className="flex items-center gap-2">
            {["UPI", "Visa", "Mastercard", "RuPay"].map((m) => (
              <span
                key={m}
                className="rounded border border-white/15 px-2 py-1 text-[10px] font-bold text-white/55"
              >
                {m}
              </span>
            ))}
          </span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/40">
            {/* <span>Printed to order</span>
            <span className="hidden h-3 w-px bg-white/15 sm:block" />
            <span>14-day returns</span>
            <span className="hidden h-3 w-px bg-white/15 sm:block" /> */}

            <span className="hidden h-3 w-px bg-white/15 sm:block" />
            <span>
              Designed by{" "}
              <a
                href="https://www.nakshatranamahacreations.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/55 transition-colors hover:text-neon-2"
              >
                Nakshatra Namaha Creations
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
