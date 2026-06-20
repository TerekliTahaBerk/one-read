import type { Metadata } from "next";
import { FilmLanding } from "@/components/FilmLanding";

export const metadata: Metadata = {
  title: "OneFilm - Tek film. Kısa bir not. İzlemeye değer bir sebep.",
  description:
    "OneFilm sana tek bir filmi, neden izlemeye değer olduğunu ve hangi ruh hâline iyi geleceğini kısa bir notla gönderir.",
};

export default function FilmPage() {
  return <FilmLanding />;
}
