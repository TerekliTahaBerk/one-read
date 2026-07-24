import type { Metadata } from "next";
import { LegalContent } from "@/components/LegalContent";

export const metadata: Metadata = {
  title: "Privacy Policy — OneRead",
  description:
    "How OneRead collects, uses, and protects the information needed to deliver OneArticle.",
};

export default function PrivacyPage() {
  return <LegalContent doc="privacy" />;
}
