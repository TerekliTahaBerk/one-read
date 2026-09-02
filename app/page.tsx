import type { Metadata } from "next";
import { HomePageContent } from "@/components/HomePageContent";

export const metadata: Metadata = {
  title: "OneRead — OneArticle and OneNews",
  description: "OneArticle and OneNews are calm, human-reviewed editorial emails with clear sources. Choose one, or get both with OneRead.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomePageContent />;
}
