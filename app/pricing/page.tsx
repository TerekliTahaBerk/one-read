import type { Metadata } from "next";
import { PricingPageContent } from "@/components/PricingPageContent";
import { pricingSummarySentence } from "@/lib/products/pricing-copy";

// A search result is a commercial surface too: it states a price to somebody
// deciding whether to click. Deriving it means a price change updates the
// listing rather than leaving last quarter's number in the index.
export const metadata: Metadata = {
  title: "Pricing — OneRead",
  description: pricingSummarySentence(),
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return <PricingPageContent />;
}
