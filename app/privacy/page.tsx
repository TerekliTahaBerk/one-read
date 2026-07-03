import type { Metadata } from "next";
import { LegalContent } from "@/components/LegalContent";

export const metadata: Metadata = {
  title: "Privacy Policy — OneRead",
  description:
    "How OneRead collects, uses, and protects your information across OneArticle and OneFilm. We collect only what we need to run your subscription.",
};

export default function PrivacyPage() {
  return <LegalContent doc="privacy" />;
}
