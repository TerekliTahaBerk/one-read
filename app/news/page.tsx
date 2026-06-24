import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "OneNews — Gündem, sabah 06.30’da hazır.",
  description:
    "OneNews her sabah 06.30’da 5 dakikalık gündem özetini e-posta kutuna getirir. Piyasalar, ekonomi, iş dünyası, politika, teknoloji ve hafta sonu ekleri; kısa, yalın, öz bir şekilde. Sponsor yok, feed yok, gürültü yok.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewsPage() {
  notFound();
}
