import type { Metadata } from "next";
import { SamplePageContent } from "@/components/SamplePageContent";

export const metadata: Metadata = {
  title: "Full OneArticle sample — OneRead",
  description: "Read a complete OneArticle email before subscribing.",
};

export default function ArticleSamplePage() {
  return <SamplePageContent />;
}
