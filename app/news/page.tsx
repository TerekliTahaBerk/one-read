import type { Metadata } from "next";
import { NewsLanding } from "@/components/NewsLanding";

export const metadata: Metadata = {
  title: "OneNews - A calmer morning briefing, every day at 7 AM.",
  description:
    "OneNews sends a short morning briefing for the stories worth knowing — clear, calm, and made for your inbox.",
};

export default function NewsPage() {
  return <NewsLanding />;
}
