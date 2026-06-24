import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ödeme alındı - OneNews",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewsSubscribeSuccessPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#F5F7FA] px-5 text-center text-ink">
      <div className="max-w-md">
        <div className="font-serif text-[12px] italic uppercase tracking-[0.22em] text-ash">OneNews</div>
        <h1 className="mt-8 font-serif text-[32px] font-medium leading-tight">Ödeme alındı.</h1>
        <p className="mt-4 text-[14px] leading-7 text-ash">
          Polar, OneNews göndermeye başlamadan önce denemeni onaylayacak. Biraz sürerse, e-postanla abonelik durumunu kontrol edebilirsin. OneNews her sabah 06.30’da gelecek.
        </p>
        <Link href="/news/subscribe" className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-[#53647A] px-5 text-[14.5px] font-medium text-white">
          Durumu kontrol et
        </Link>
      </div>
    </main>
  );
}
