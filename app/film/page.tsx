import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "OneFilm - Tek film. Kısa bir not. İzlemeye değer bir sebep.",
  description:
    "OneFilm sana tek bir filmi, neden izlemeye değer olduğunu ve hangi ruh hâline iyi geleceğini kısa bir notla gönderir.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FilmPage() {
  notFound();
}
