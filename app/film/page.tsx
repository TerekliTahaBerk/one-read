import type { Metadata } from "next";
import { FilmLanding } from "@/components/FilmLanding";

export const metadata: Metadata = {
  title: "OneFilm - One film worth thinking about, delivered to your inbox.",
  description:
    "OneFilm sends one thoughtful film note or recommendation — a calmer way to choose what to watch.",
};

export default function FilmPage() {
  return <FilmLanding />;
}
