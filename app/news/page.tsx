import type { Metadata } from "next";
import { NewsLanding } from "@/components/NewsLanding";

export const metadata: Metadata = {
  title: "OneNews — Your morning briefing, ready at 6:30 AM.",
  description:
    "OneNews sends a 5-minute morning briefing every day — included in your OneRead subscription.",
  openGraph: {
    title: "OneNews",
    description: "A 5-minute morning briefing every day, included in OneRead.",
    type: "website",
  },
};

export default function NewsPage() {
  return <NewsLanding />;
}
