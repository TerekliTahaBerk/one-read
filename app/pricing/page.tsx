import type { Metadata } from "next";
import { PricingPageContent } from "@/components/PricingPageContent";

export const metadata: Metadata = {
  title: "Pricing — OneRead",
  description:
    "OneRead is one subscription that includes every product in the OneRead family.",
};

export default function PricingPage() {
  return <PricingPageContent />;
}
