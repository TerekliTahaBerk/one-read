import type { Metadata } from "next";
import { PricingPageContent } from "@/components/PricingPageContent";

export const metadata: Metadata = {
  title: "Pricing — OneRead",
  description:
    "OneRead is one subscription for OneArticle in your chosen reading language.",
};

export default function PricingPage() {
  return <PricingPageContent />;
}
