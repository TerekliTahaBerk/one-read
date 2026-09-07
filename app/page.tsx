import type { Metadata } from "next";
import { HomePageContent } from "@/components/HomePageContent";

export const metadata: Metadata = {
  title: "OneRead — One thing worth your time",
  description:
    "OneArticle and OneNews: calm, human-reviewed editorial email with clear sources. Take either on its own, or both as OneRead.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomePageContent />;
}
