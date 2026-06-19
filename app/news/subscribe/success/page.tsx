import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Checkout received - OneNews",
};

export default function NewsSubscribeSuccessPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#F5F7FA] px-5 text-center text-ink">
      <div className="max-w-md">
        <div className="font-serif text-[12px] italic uppercase tracking-[0.22em] text-ash">OneNews</div>
        <h1 className="mt-8 font-serif text-[32px] font-medium leading-tight">Checkout received.</h1>
        <p className="mt-4 text-[14px] leading-7 text-ash">
          Polar will confirm your trial before OneNews starts sending. If this takes a moment, check your subscription status with your email.
        </p>
        <Link href="/news/subscribe" className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-[#53647A] px-5 text-[14.5px] font-medium text-white">
          Check status
        </Link>
      </div>
    </main>
  );
}
