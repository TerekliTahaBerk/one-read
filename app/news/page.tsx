import type { Metadata } from "next";
import { NewsLanding } from "@/components/NewsLanding";

export const metadata: Metadata = {
  title: "OneNews — One important story worth understanding.",
  description: "Every Monday, Wednesday, and Friday, OneNews explains one important story with context and clearly shown sources.",
  alternates: { canonical: "/news" },
  openGraph: {
    title: "OneNews",
    description: "One important story, explained with context, three times a week.",
    type: "website",
  },
};

export default function NewsPage() {
  return <NewsLanding />;
}
