"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { OneNewsMascotArt } from "@/components/OneReadFamilyMascots";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { productThemes } from "@/lib/product-themes";

const COPY = {
  en: {
    title: "One story worth understanding.", emphasis: "Three times a week.",
    intro: "OneNews picks one important story every Monday, Wednesday, and Friday, then explains what happened, why it matters, and what to watch next — with multiple credible sources clearly shown.",
    maxim: "One story. The context that makes it matter. Nothing else.",
    included: "One subscription can include OneArticle and OneNews.",
    details: [["One important story", "No headline pile-up. Each edition focuses on the story that most deserves your attention."], ["Context, not noise", "Understand what happened, why it matters, and what remains uncertain without following a live feed."], ["Multiple credible sources", "Material claims are checked across reliable sources, which are shown clearly in every edition."], ["Human reviewed", "Every brief is edited, checked, previewed, and scheduled by a human before it reaches your inbox."], ["Read in your language", "Choose one reading language for your OneRead editorial products and change it later in My OneRead."]],
    sample: "See a full OneNews sample", cta: "Choose OneNews", tagline: "No breaking-news treadmill. One story worth understanding.",
  },
  tr: {
    title: "Anlamaya değer tek bir hikâye.", emphasis: "Haftada üç kez.",
    intro: "OneNews her pazartesi, çarşamba ve cuma önemli bir hikâye seçer; ne olduğunu, neden önemli olduğunu ve sırada neyi izlemek gerektiğini açık kaynaklarla anlatır.",
    maxim: "Tek hikâye. Onu anlamlı kılan bağlam. Başka hiçbir şey yok.", included: "Tek abonelik OneArticle ve OneNews’i birlikte içerebilir.",
    details: [["Tek önemli hikâye", "Başlık yığını yok. Her gönderi, dikkatinizi en çok hak eden hikâyeye odaklanır."], ["Gürültü değil, bağlam", "Canlı akış takip etmeden ne olduğunu, neden önemli olduğunu ve nelerin belirsiz kaldığını anlayın."], ["Birden fazla güvenilir kaynak", "Önemli iddialar güvenilir kaynaklarla karşılaştırılır ve her gönderide açıkça gösterilir."], ["İnsan kontrolünde", "Her brief gönderilmeden önce bir insan tarafından düzenlenir, kontrol edilir ve önizlenir."], ["Kendi dilinizde okuyun", "OneRead editoryal ürünleri için tek bir okuma dili seçin; daha sonra My OneRead’den değiştirin."]],
    sample: "Tam OneNews örneğini gör", cta: "OneNews’i seç", tagline: "Son dakika koşu bandı yok. Anlamaya değer tek bir hikâye.",
  },
  de: {
    title: "Eine Geschichte, die man verstehen sollte.", emphasis: "Dreimal pro Woche.", intro: "OneNews wählt montags, mittwochs und freitags eine wichtige Geschichte aus und erklärt, was geschah, warum es zählt und worauf man achten sollte — mit klar ausgewiesenen Quellen.", maxim: "Eine Geschichte. Der Kontext, der sie wichtig macht. Sonst nichts.", included: "Ein Abo kann OneArticle und OneNews gemeinsam enthalten.", details: [["Eine wichtige Geschichte", "Keine Flut von Schlagzeilen. Jede Ausgabe konzentriert sich auf das Thema, das Ihre Aufmerksamkeit verdient."], ["Kontext statt Lärm", "Verstehen Sie Ereignis, Bedeutung und offene Fragen ohne Live-Feed."], ["Mehrere verlässliche Quellen", "Wesentliche Aussagen werden geprüft und die Quellen klar ausgewiesen."], ["Menschlich geprüft", "Jede Ausgabe wird vor dem Versand redigiert, geprüft und angesehen."], ["In Ihrer Sprache", "Wählen Sie eine Lesesprache für Ihre OneRead-Produkte."]], sample: "Vollständiges OneNews-Beispiel", cta: "OneNews wählen", tagline: "Kein Nachrichten-Laufband. Eine Geschichte, die man verstehen sollte.",
  },
  fr: {
    title: "Une histoire importante à comprendre.", emphasis: "Trois fois par semaine.", intro: "Chaque lundi, mercredi et vendredi, OneNews choisit une histoire importante et explique ce qui s’est passé, pourquoi cela compte et ce qu’il faut surveiller — avec des sources clairement indiquées.", maxim: "Une histoire. Le contexte qui lui donne du sens. Rien d’autre.", included: "Un abonnement peut réunir OneArticle et OneNews.", details: [["Une histoire importante", "Pas d’avalanche de titres. Chaque édition se concentre sur ce qui mérite vraiment votre attention."], ["Du contexte, pas du bruit", "Comprenez les faits, leur importance et les incertitudes sans suivre un fil en direct."], ["Plusieurs sources fiables", "Les affirmations importantes sont vérifiées et les sources clairement présentées."], ["Vérification humaine", "Chaque édition est relue, vérifiée et prévisualisée avant envoi."], ["Dans votre langue", "Choisissez une langue de lecture commune pour vos produits OneRead."]], sample: "Voir un exemple OneNews complet", cta: "Choisir OneNews", tagline: "Pas de course à l’actualité. Une histoire importante à comprendre.",
  },
} as const;

export function NewsLanding() {
  const theme = productThemes.news;
  const { locale, dictionary } = useSiteLanguage();
  const copy = COPY[locale];
  return <main className="relative flex min-h-svh w-full flex-col items-center px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6" style={{ backgroundColor: productThemes.read.background, "--theme-accent": theme.accent, "--theme-border": theme.border, "--theme-surface": theme.surface, "--theme-selected-surface": theme.selectedSurface, "--theme-page": productThemes.read.background, "--theme-focus": theme.accent } as CSSProperties}>
    <header className="relative flex w-full justify-center animate-rise"><Link href="/" aria-label={dictionary.common.backToOneRead} className="focus-ring absolute left-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-ash transition-colors hover:bg-[var(--theme-surface)] hover:text-ink"><svg width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M12 7H2M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></Link><Logo label="OneNews" href="/news" ariaLabel="OneNews" /></header>
    <section className="mx-auto flex w-full max-w-[38rem] flex-1 flex-col items-center justify-center py-6 sm:py-8">
      <div aria-hidden="true" className="product-mascot mb-3 h-[7.5rem] w-[7.5rem] animate-rise-delayed sm:mb-4 sm:h-[8.5rem] sm:w-[8.5rem]"><OneNewsMascotArt /></div>
      <h1 className="max-w-[16ch] text-balance text-center font-serif text-[2.5rem] font-medium leading-[1.02] tracking-[-0.028em] text-ink animate-rise-delayed sm:text-[3.6rem] sm:leading-[0.98]">{copy.title} <em className="font-serif font-normal italic">{copy.emphasis}</em></h1>
      <p className="mt-5 max-w-[44ch] text-pretty text-center font-sans text-[15px] leading-[1.65] text-ash animate-rise-delayed-2 sm:mt-6 sm:text-[16px]">{copy.intro}</p>
      <p className="mt-4 text-center font-serif text-[14px] italic leading-[1.6] text-ash animate-rise-delayed-2">{copy.maxim}</p>
      <p className="mt-5 text-center font-sans text-[12.5px] leading-[1.55] text-fog animate-rise-delayed-2">{copy.included} <Link href="/pricing" className="link-underline text-ink">OneRead</Link></p>
      <div className="mt-7 flex w-full flex-col items-center gap-3 animate-rise-delayed-3 sm:mt-8 sm:flex-row sm:justify-center"><Link href="/subscribe?offer=one-news&interval=annual" className="focus-ring inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 font-sans text-[14px] font-medium text-paper transition-[filter] hover:brightness-95 sm:w-auto">{copy.cta}</Link><Link href="/samples/news" className="focus-ring inline-flex h-12 w-full items-center justify-center rounded-full border border-[var(--theme-border)] bg-white px-6 font-sans text-[14px] font-medium text-ink transition-colors hover:bg-[var(--theme-surface)] sm:w-auto">{copy.sample}</Link></div>
      <dl className="mt-10 w-full max-w-[36rem] space-y-5 animate-rise-delayed-3 sm:mt-12">{copy.details.map(([title, body]) => <div key={title} className="border-t border-[var(--theme-border)] pt-4"><dt className="font-serif text-[1.05rem] font-medium leading-snug text-ink">{title}</dt><dd className="mt-1.5 font-sans text-[14px] leading-[1.65] text-ash">{body}</dd></div>)}</dl>
      <NewsPreview sampleLabel={copy.sample} />
    </section>
    <Footer tagline={copy.tagline} />
  </main>;
}

function NewsPreview({ sampleLabel }: { sampleLabel: string }) {
  return <div className="mt-10 w-full max-w-[34rem] rounded-2xl border border-[var(--theme-border)] bg-white p-6 animate-rise-delayed-4 sm:mt-12 sm:p-8"><div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-4"><span className="font-serif text-lg font-medium">OneNews</span><span className="font-sans text-[10px] uppercase tracking-[.14em] text-fog">Sample edition</span></div><p className="mt-5 font-serif text-2xl font-medium leading-tight">Why the world needs a shared clock</p><p className="mt-3 font-sans text-[13px] leading-6 text-ash">What happened · Why it matters · What to watch · Sources & notes</p><Link href="/samples/news" className="focus-ring link-underline mt-5 inline-block rounded-sm font-sans text-[13px] text-ink">{sampleLabel}</Link></div>;
}
