import SmoothScroll from "@/components/SmoothScroll";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CartFly from "@/components/CartFly";

export default function ShopLayout({ children }) {
  return (
    <SmoothScroll>
      <AnnouncementBar />
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CartDrawer />
      <CartFly />
    </SmoothScroll>
  );
}
