import type { Metadata } from "next";
import { PricingPageContent } from "@/components/PricingPageContent";

export const metadata: Metadata = {
  title: "Pricing — OneRead",
  description: "OneArticle is $2 monthly or $18 annually. OneNews is $3 monthly or $27 annually. Get both with OneRead for $4 monthly or $36 annually.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return <PricingPageContent />;
}
