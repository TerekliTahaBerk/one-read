import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ödeme alındı - OneFilm",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FilmSubscribeSuccessPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#F8F4FA] px-5 text-center text-ink">
      <div className="max-w-md">
        <div className="font-serif text-[12px] italic uppercase tracking-[0.22em] text-ash">OneFilm</div>
        <h1 className="mt-8 font-serif text-[32px] font-medium leading-tight">Ödeme alındı.</h1>
        <p className="mt-4 text-[14px] leading-7 text-ash">
          Polar, OneFilm göndermeye başlamadan önce denemeni onaylayacak. Biraz sürerse, e-postanla abonelik durumunu kontrol edebilirsin.
        </p>
        <Link href="/film/subscribe" className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-[#7B5E8E] px-5 text-[14.5px] font-medium text-white">
          Durumu kontrol et
        </Link>
      </div>
    </main>
  );
}
