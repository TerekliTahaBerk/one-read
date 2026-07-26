"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";

const PRODUCT_NAMES: Record<string, string> = {
  onegoal: "OneGoal",
  onenews: "OneNews",
  onelingo: "OneLingo",
  onedish: "OneDish",
};

const COPY = {
  en: {
    eyebrow: "Coming soon",
    title: (name: string) => `${name} is taking shape.`,
    body: (name: string) => `Leave your email and we'll send one note when ${name} is ready. No general marketing list.`,
    placeholder: "you@example.com",
    cta: "Join the waitlist",
    pending: "Saving…",
    success: "You're on the list. We'll only write when this product is ready.",
    error: "We couldn't save that address. Please check it and try again.",
    privacy: "Your address is used only for this product update.",
    back: "Back to OneRead",
  },
  tr: {
    eyebrow: "Yakında",
    title: (name: string) => `${name} şekilleniyor.`,
    body: (name: string) => `E-postanı bırak; ${name} hazır olduğunda sana tek bir not gönderelim. Genel pazarlama listesi yok.`,
    placeholder: "sen@ornek.com",
    cta: "Bekleme listesine katıl",
    pending: "Kaydediliyor…",
    success: "Listeye eklendin. Yalnızca bu ürün hazır olduğunda yazacağız.",
    error: "Bu adresi kaydedemedik. Kontrol edip tekrar dene.",
    privacy: "Adresin yalnızca bu ürün güncellemesi için kullanılır.",
    back: "OneRead’e dön",
  },
  de: {
    eyebrow: "Demnächst",
    title: (name: string) => `${name} nimmt Gestalt an.`,
    body: (name: string) => `Hinterlasse deine E-Mail. Wir senden eine Nachricht, sobald ${name} bereit ist — keine allgemeine Marketingliste.`,
    placeholder: "du@beispiel.de",
    cta: "Auf die Warteliste",
    pending: "Wird gespeichert…",
    success: "Du bist auf der Liste. Wir schreiben nur, wenn dieses Produkt bereit ist.",
    error: "Die Adresse konnte nicht gespeichert werden. Bitte prüfen und erneut versuchen.",
    privacy: "Deine Adresse wird nur für dieses Produkt-Update verwendet.",
    back: "Zurück zu OneRead",
  },
  fr: {
    eyebrow: "Bientôt",
    title: (name: string) => `${name} prend forme.`,
    body: (name: string) => `Laissez votre e-mail : nous enverrons un seul message lorsque ${name} sera prêt. Aucune liste marketing générale.`,
    placeholder: "vous@exemple.com",
    cta: "Rejoindre la liste",
    pending: "Enregistrement…",
    success: "Vous êtes sur la liste. Nous écrirons uniquement lorsque ce produit sera prêt.",
    error: "Impossible d'enregistrer cette adresse. Vérifiez-la et réessayez.",
    privacy: "Votre adresse sert uniquement à cette mise à jour produit.",
    back: "Retour à OneRead",
  },
} as const;

export function WaitlistForm({ product }: { product: string }) {
  const { locale } = useSiteLanguage();
  const t = COPY[locale];
  const name = PRODUCT_NAMES[product] ?? "This OneRead product";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState("pending");
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, product, locale }),
    });
    setState(response.ok ? "success" : "error");
  }

  return (
    <main className="min-h-svh bg-white px-5 py-8 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-[34rem] flex-col justify-center text-center">
        <p className="font-sans text-[11px] uppercase tracking-eyebrow text-fog">{t.eyebrow}</p>
        <h1 className="mt-3 font-serif text-[2.25rem] font-medium leading-[1.08] text-ink sm:text-[3rem]">
          {t.title(name)}
        </h1>
        <p className="mx-auto mt-5 max-w-[44ch] font-sans text-[15px] leading-[1.65] text-ash">
          {t.body(name)}
        </p>
        {state === "success" ? (
          <p role="status" className="mt-8 rounded-xl border border-line bg-cream px-5 py-4 text-[14px] leading-relaxed text-ink">
            {t.success}
          </p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="waitlist-email">Email</label>
            <input
              id="waitlist-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.placeholder}
              className="h-12 min-w-0 flex-1 rounded-xl border border-line-strong px-4 font-sans text-[15px] outline-none focus:border-ink"
            />
            <button disabled={state === "pending"} className="h-12 rounded-xl bg-ink px-5 font-sans text-[14px] font-medium text-white disabled:opacity-60">
              {state === "pending" ? t.pending : t.cta}
            </button>
          </form>
        )}
        {state === "error" && <p role="alert" className="mt-3 text-[13px] text-dawn">{t.error}</p>}
        <p className="mt-4 text-[12px] text-fog">{t.privacy}</p>
        <Link href="/" className="mx-auto mt-10 inline-flex min-h-11 items-center text-[13px] text-ash underline underline-offset-4">
          {t.back}
        </Link>
      </section>
    </main>
  );
}
