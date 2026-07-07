import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";

export const metadata: Metadata = {
  title: "Blog — OneRead",
  description:
    "Occasional notes from OneRead on a calmer way to read — why one email is enough, how we choose, and what a quieter inbox can feel like.",
  openGraph: {
    title: "The OneRead blog",
    description: "Occasional notes from OneRead on a calmer way to read.",
    type: "website",
  },
};

export default function BlogPage() {
  return <BlogIndex />;
}
