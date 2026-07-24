import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "OneFilm — One film worth watching. Every Saturday.",
  description:
    "OneFilm sends one carefully chosen film note every Saturday — included in your OneRead subscription.",
  openGraph: {
    title: "OneFilm",
    description: "One film note every Saturday, included in OneRead.",
    type: "website",
  },
};

export default function FilmPage() {
  redirect("/waitlist?product=onefilm");
}
