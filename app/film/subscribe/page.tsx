import type { Metadata } from "next";
import { FilmSubscribePageContent } from "@/components/FilmSubscribePageContent";

export const metadata: Metadata = {
  title: "Subscribe — OneFilm",
  description: "Start or manage your OneFilm subscription.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FilmSubscribePage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  return <FilmSubscribePageContent initialEmail={searchParams.email ?? ""} />;
}
