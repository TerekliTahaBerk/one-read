import type { Metadata } from "next";
import { ArticleLanding } from "@/components/ArticleLanding";

export const metadata: Metadata = {
  title: "OneArticle — One article worth reading. Every morning.",
  description:
    "Choose your interests and language preferences. Every morning at 7 AM, OneArticle sends one carefully chosen article brief to your inbox.",
  openGraph: {
    title: "OneArticle",
    description: "One carefully chosen article brief every morning.",
    type: "website",
  },
};

export default function ArticlePage() {
  return <ArticleLanding />;
}
