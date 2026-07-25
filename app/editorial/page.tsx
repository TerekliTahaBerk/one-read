import type { Metadata } from "next";
import { EditorialStandardsContent } from "@/components/EditorialStandardsContent";

export const metadata: Metadata = {
  title: "Editorial standards — OneRead",
  description: "How OneRead selects, verifies, reviews, and publishes OneArticle and OneFilm editions.",
};

export default function EditorialStandardsPage() {
  return <EditorialStandardsContent />;
}
