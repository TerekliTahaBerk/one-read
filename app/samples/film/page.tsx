import type { Metadata } from "next";
import { SamplePageContent } from "@/components/SamplePageContent";

export const metadata: Metadata = {
  title: "Full OneFilm sample — OneRead",
  description: "Read a complete OneFilm email before subscribing.",
};

export default function FilmSamplePage() {
  return <SamplePageContent product="film" />;
}
