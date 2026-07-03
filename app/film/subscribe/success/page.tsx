import type { Metadata } from "next";
import { FilmSubscribeSuccessContent } from "@/components/FilmSubscribeSuccessContent";

export const metadata: Metadata = {
  title: "Checkout received — OneFilm",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FilmSubscribeSuccessPage() {
  return <FilmSubscribeSuccessContent />;
}
