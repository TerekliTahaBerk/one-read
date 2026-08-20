import type { Metadata } from "next";
import { PricingPageContent } from "@/components/PricingPageContent";

export const metadata: Metadata = {
  title: "Pricing — OneRead",
  description:
    "One monthly OneRead subscription delivers OneArticle every weekday.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return <PricingPageContent />;
}
