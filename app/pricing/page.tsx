import type { Metadata } from "next";
import { PricingPageContent } from "@/components/PricingPageContent";

export const metadata: Metadata = {
  title: "Pricing — OneRead",
  description:
    "One monthly OneRead subscription includes OneArticle and OneFilm.",
};

export default function PricingPage() {
  return <PricingPageContent />;
}
