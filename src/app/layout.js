import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import AppInit from "@/components/AppInit";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  title: "OROS — 3D Printed Goods, Printed to Order",
  description:
    "Shop 3D printed figurines, lighting, desk storage and decor. Printed to order, shipped in 48 hours. Bulk pricing from 25 units.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jakarta.variable}`}>
      {/* extensions (ColorZilla, Grammarly…) stamp attributes on <body>
          before React hydrates — ignore those, they are not app bugs */}
      <body suppressHydrationWarning>
        <AppInit />
        {children}
      </body>
    </html>
  );
}
