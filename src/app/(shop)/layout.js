import SmoothScroll from "@/components/SmoothScroll";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CartFly from "@/components/CartFly";
import { fetchCategories } from "@/lib/catalog";

export default async function ShopLayout({ children }) {
  // Fetch server-side so the category hex rail is in the HTML on first paint
  // instead of waiting for Header to hydrate and then run a client fetch.
  const categories = await fetchCategories();

  return (
    <SmoothScroll>
      <AnnouncementBar />
      <Header initialCategories={categories} />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CartDrawer />
      <CartFly />
    </SmoothScroll>
  );
}
