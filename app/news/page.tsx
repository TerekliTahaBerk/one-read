import type { Metadata } from "next";
import { NewsLanding } from "@/components/NewsLanding";

export const metadata: Metadata = {
  title: "OneNews — One story worth understanding.",
  description:
    "OneNews explains one important story on Monday, Wednesday, and Friday — what happened, why it matters, what to watch, and the sources it was built from.",
  alternates: { canonical: "/news" },
  openGraph: {
    title: "OneNews",
    description: "One story worth understanding, explained three mornings a week.",
    type: "website",
  },
};

export default function NewsPage() {
  return <NewsLanding />;
}
