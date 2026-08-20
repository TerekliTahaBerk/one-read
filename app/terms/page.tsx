import type { Metadata } from "next";
import { LegalContent } from "@/components/LegalContent";

export const metadata: Metadata = {
  title: "Terms of Service — OneRead",
  description:
    "The terms for using the monthly OneRead subscription, including OneArticle.",
};

export default function TermsPage() {
  return <LegalContent doc="terms" />;
}
