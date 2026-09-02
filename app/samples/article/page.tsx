import type { Metadata } from "next";
import { SamplePageContent } from "@/components/SamplePageContent";
import { TrackEventOnMount } from "@/components/TrackEventOnMount";

export const metadata: Metadata = {
  title: "Full OneArticle sample — OneRead",
  description: "Read a complete OneArticle email before subscribing.",
  alternates: { canonical: "/samples/article" },
};

export default function ArticleSamplePage() {
  return (
    <>
      <TrackEventOnMount event="public_sample_viewed" properties={{ product: "one-article" }} />
      <SamplePageContent />
    </>
  );
}
