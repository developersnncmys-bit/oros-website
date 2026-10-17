import CartClient from "@/components/CartClient";

export const metadata = {
  title: "My cart — OROS",
  description: "Review your cart, adjust quantities and see bulk tier pricing applied automatically.",
};

export default function CartPage() {
  return <CartClient />;
}
