import type { Metadata } from "next";
import { LegalContent } from "@/components/LegalContent";

export const metadata: Metadata = {
  title: "Terms of Service — OneRead",
  description:
    "The terms for using OneRead, the subscription that currently includes OneArticle.",
};

export default function TermsPage() {
  return <LegalContent doc="terms" />;
}
