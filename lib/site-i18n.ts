export const SITE_LOCALES = ["en", "tr", "de", "fr"] as const;

export type SiteLocale = (typeof SITE_LOCALES)[number];

export const SITE_LOCALE_COOKIE = "oneread-site-language";

export const LANGUAGE_NAMES: Record<SiteLocale, string> = {
  en: "English",
  tr: "Türkçe",
  de: "Deutsch",
  fr: "Français",
};

export function normalizeSiteLocale(value?: string | null): SiteLocale {
  return SITE_LOCALES.includes(value as SiteLocale)
    ? (value as SiteLocale)
    : "en";
}

const en = {
  common: {
    backToOneRead: "Back to OneRead",
    oneReadHome: "OneRead home",
    startOneRead: "Start OneRead",
    includedIn: "Included in",
    subscriptionCovers: "one subscription covers OneArticle and OneNews.",
  },
  language: { label: "Language", menu: "Choose language" },
  footer: {
    terms: "Terms",
    privacy: "Privacy",
    pricing: "Pricing",
    navigation: "Footer",
    feedback: "Open feedback form",
    manifesto: "For people who want better inputs without another app to open.",
    defaultTagline: "No feeds. No noise. Just one good read.",
  },
  home: {
    title: "One useful email at a time.",
    intro:
      "OneRead brings small, single-purpose notes to your inbox — OneArticle on weekday mornings, OneNews on Monday, Wednesday, and Friday.",
    tagline: "No feed to check. Just something worth opening.",
  },
  // Heads the two products the homepage draws as characters. Names the two
  // products and the bundle rather than a "family", which was planning-era
  // vocabulary for a line-up that was never built. The per-product lines are
  // labels under a drawing, not marketing copy: keep them to a few words.
  lineUp: {
    title: "Two products. One subscription.",
    intro:
      "OneArticle arrives on weekday mornings, OneNews on Monday, Wednesday, and Friday. Take either on its own, or take both as OneRead.",
    article: "Weekday article brief",
    news: "News brief, explained",
  },
  article: {
    title: "One article worth reading.",
    titleEmphasis: "Every morning.",
    intro:
      "OneArticle sends one carefully chosen article brief to your inbox every weekday morning — picked around your interests and distilled into a short, clear read. No feed to scroll. No app to open.",
    maxim: "One article. One idea worth knowing. Nothing else.",
    tagline: "No feed. No app. One good read before the day gets noisy.",
    details: [
      ["One brief, every weekday morning", "At 7 AM, one carefully chosen article lands in your inbox — read start to finish in about five minutes, before the rest of the day gets noisy."],
      ["Chosen around your interests", "Pick a handful of topics you actually care about. Every brief is matched to that profile, not to whatever is trending."],
      ["Distilled, not just forwarded", "We don't just link out — we read the source and write a short, clear summary of the one idea worth knowing."],
      ["Read in your language", "Choose your summary language and your preferred source language independently — English, Turkish, Spanish, French, or German."],
      ["Edit anytime", "Change your interests or languages whenever you like. The next morning's brief reflects it immediately."],
    ],
  },
  news: {
    title: "One story worth understanding.",
    titleEmphasis: "Three mornings a week.",
    intro:
      "OneNews explains one important story instead of handing you a feed of headlines. Each edition sets out what happened, why it matters, and what to watch next — with the sources it was built from.",
    maxim: "One story. Enough context to hold it. Nothing else.",
    tagline: "No feed. No alerts. One story, explained.",
    details: [
      ["One important story per edition", "Rather than summarising everything, each edition picks the single story worth your attention and stays with it from beginning to end."],
      ["Monday, Wednesday, and Friday", "Three editions a week, so the news arrives on a rhythm you can keep up with instead of one that follows you around all day."],
      ["Context, not just headlines", "Every edition is built around what happened, why it matters, and what to watch — the parts a headline leaves out."],
      ["Human-reviewed and structured", "An editor is responsible for selection, review, and publication. Developing information is labelled with an as-of time, and contested claims are kept apart from established facts."],
      ["Clear sources and notes", "Each edition ends with the sources it was built from, marked as primary records, reporting, or analysis, so you can go further whenever you want to."],
    ],
  },
  // The pricing page's static language only. Every amount, percentage,
  // cadence, and bundle-contents line on that page is derived from the offer
  // registry through `pricing-copy`, so no price is ever translated here:
  // `{saving}` is filled in with the derived annual claim at render time.
  pricing: {
    eyebrow: "Simple pricing · USD",
    title: "Choose one product, or both.",
    intro:
      "Annual billing {saving} and is selected by default; it is charged once a year, not monthly. Monthly billing stays available. No trial—the full samples are open.",
    billingLegend: "Billing interval",
    annual: "Annual",
    monthly: "Monthly",
    includedLabel: "Included",
    cadenceLabel: "Arrives",
    choose: "Choose {name}",
    trust:
      "Billed securely by Polar. Cancel anytime through the billing portal. Email preferences are separate from billing.",
  },
  // The signup flow's static language. Every amount, percentage, cadence and
  // bundle-contents line those screens show is derived from the offer registry
  // through `pricing-copy`, so no commercial value is ever translated here.
  // `{saving}`, `{name}`, `{email}`, `{plan}` and `{products}` are filled in
  // with derived copy at render time. The grandfathering lines are the one
  // place a closed price may be named, because they are a disclosure to the
  // people on it rather than a sales claim.
  signup: {
    planTitle: "Choose what deserves your time",
    planIntro:
      "Annual billing {saving} and is selected by default; it is charged once a year. You can switch to monthly.",
    planGroupLabel: "Choose a OneRead plan",
    billingLegend: "Billing interval",
    selected: "Selected",
    continueWith: "Continue with {name}",
    emailTitle: "Start {name}",
    emailIntro:
      "One address, and a code to confirm it. No trial — the full samples are already open.",
    emailLabel: "Email address",
    emailCta: "Email me a code",
    emailInvalid: "Enter a valid email address.",
    emailFailed: "We could not send a code. Please try again.",
    verifyTitle: "Check your inbox",
    verifyIntro: "We sent a six-digit code to {email}.",
    verifyBinding: "It confirms {plan} — change the plan and you will need a new code.",
    verifyLabel: "Verification code",
    verifyCta: "Verify email",
    verifyInvalid: "Enter the six-digit code.",
    verifyIncorrect: "That code is not correct.",
    verifyFailed: "The code could not be verified.",
    languageTitle: "Choose your reading language",
    languageLegend: "Reading language",
    languageIntroBundle: "One choice applies to {products}.",
    languageIntroSingle: "One choice for {name}.",
    languageFailed: "We could not save your reading language.",
    continue: "Continue",
    reviewTitle: "You're ready",
    reviewIntro: "Email delivery can be changed later without cancelling billing.",
    reviewLanguageLabel: "Reading language",
    checkoutCta: "Continue to secure checkout",
    checkoutNote: "Cancel anytime through the secure billing portal.",
    checkoutUnavailable: "Checkout is unavailable.",
    planChanged:
      "Your plan changed since you verified. Please confirm a new code for this plan.",
    transitionTitle: "Confirm your plan change",
    transitionIntro: "Review this change before continuing.",
    transitionPeriodEnd:
      "This change will take effect at the end of your current billing period.",
    transitionProvider:
      "Polar will confirm the timing and any exact charge before applying this change.",
    transitionCta: "Confirm plan change",
    transitionUnavailable: "This plan change is not available.",
    transitionFailed: "The plan change could not be completed.",
    grandfatherNotice:
      "Your current $1 plan is grandfathered. If you switch plans, this legacy price may not be available again.",
    grandfatherAcknowledge:
      "I understand that switching plans gives up my grandfathered $1 price and it may not be restored.",
    grandfatherRequired:
      "Confirm that you understand the grandfathered price will be lost.",
  },
  // My OneRead. Cadences, plan names and billing intervals come from the
  // account lookup, which reads them from the registry — only the labels
  // around them are translated.
  preferences: {
    title: "My OneRead",
    lookupIntro: "Manage your products, email delivery, and billing.",
    separation:
      "Billing and email delivery are separate. Turning off email never cancels a paid plan.",
    emailLabel: "Email address",
    emailCta: "Email me a code",
    emailInvalid: "Enter a valid email address.",
    emailFailed: "We could not send a code.",
    verifyTitle: "Check your inbox",
    verifyIntro: "We sent a six-digit code to {email}.",
    codeLabel: "Verification code",
    codeCta: "Verify",
    codeFailed: "That code could not be verified.",
    lookupFailed: "We could not load your account.",
    active: "Active",
    inactive: "Inactive",
    cadenceLabel: "Arrives",
    languageLabel: "Reading language",
    languageUnset: "Not set",
    emailStatusLabel: "Email",
    emailOn: "On",
    emailOff: "Off",
    emailSuppressed: "Suppressed",
    turnEmailOff: "Turn email off",
    resumeEmail: "Resume email",
    suppressed:
      "This address is suppressed after a provider safety event. Contact support to review it.",
    updateFailed: "We could not update email delivery.",
    billingHeading: "Billing",
    intervalLabel: "Billing interval",
    stateLabel: "State",
    pendingChange: "Changing to {offer}, billed {interval}",
    grandfathered:
      "Grandfathered $1 plan. OneArticle remains included; OneNews is not silently added.",
    turnOffAll: "Turn off all editorial email",
    manageBilling: "Manage billing",
    viewPlans: "View plans",
    portalUnavailable: "The billing portal is unavailable right now.",
  },
  subscribeSuccess: {
    eyebrow: "Checkout complete",
    title: "We're activating OneRead.",
    body: "Your checkout is complete. We'll activate OneRead as soon as Polar confirms your subscription.",
    checkoutLabel: "Checkout {id}",
    cta: "Check subscription status",
  },
  unsubscribe: {
    preview: {
      headline: "Preview mode.",
      body: "This is a preview. Real subscribers would now be unsubscribed.",
    },
    notFound: {
      headline: "We couldn't find that subscription.",
      body: "If this is unexpected, reply to any OneRead email and we'll fix it.",
    },
    alreadyDone: {
      headline: "You're already unsubscribed.",
      body: "No further emails will arrive. Take care.",
    },
    doneProduct: {
      headline: "You're unsubscribed.",
      body: "No more {product} emails. If you change your mind, you can resume emails from the subscribe page.",
    },
    doneGeneric: {
      headline: "You're unsubscribed.",
      body: "No more emails from OneRead. If you change your mind, you can sign up again any morning.",
    },
    error: {
      headline: "Something went wrong.",
      body: "We've logged it. Please try again, or reply to any OneRead email.",
    },
    tagline: "One good read. Every morning. Curated for you.",
  },
};

export type SiteDictionary = typeof en;

const tr: SiteDictionary = {
  common: { backToOneRead: "OneRead’e dön", oneReadHome: "OneRead ana sayfası", startOneRead: "OneRead’i başlat", includedIn: "Şuna dahil:", subscriptionCovers: "tek abonelik OneArticle ve OneNews’i kapsar." },
  language: { label: "Dil", menu: "Dil seç" },
  footer: { terms: "Koşullar", privacy: "Gizlilik", pricing: "Fiyatlandırma", navigation: "Alt menü", feedback: "Geri bildirim formunu aç", manifesto: "Daha iyi içerik isteyen ama açacak yeni bir uygulama istemeyenler için.", defaultTagline: "Akış yok. Gürültü yok. Yalnızca iyi bir okuma." },
  home: { title: "Her seferinde tek bir faydalı e-posta.", intro: "OneRead, küçük ve tek amaçlı notları gelen kutuna getirir — hafta içi sabahları OneArticle, pazartesi, çarşamba ve cuma günleri OneNews.", tagline: "Kontrol edilecek bir akış yok. Yalnızca açmaya değer bir şey." },
  lineUp: { title: "İki ürün. Tek abonelik.", intro: "OneArticle hafta içi sabahları, OneNews pazartesi, çarşamba ve cuma günleri gelir. Birini tek başına al ya da ikisini birden OneRead ile al.", article: "Hafta içi makale özeti", news: "Açıklamalı haber özeti" },
  article: { title: "Okumaya değer tek bir makale.", titleEmphasis: "Her sabah.", intro: "OneArticle, ilgi alanlarına göre seçilmiş tek bir makale özetini hafta içi her sabah gelen kutuna gönderir; kısa ve açık bir okumaya dönüştürür. Kaydırılacak akış yok. Açılacak uygulama yok.", maxim: "Tek makale. Bilmeye değer tek fikir. Başka hiçbir şey yok.", tagline: "Akış yok. Uygulama yok. Gün gürültüye dönüşmeden tek iyi okuma.", details: [["Hafta içi her sabah tek özet", "Saat 07.00’de özenle seçilmiş tek bir makale gelen kutuna düşer — günün geri kalanı gürültüye dönüşmeden yaklaşık beş dakikada baştan sona okunur."], ["İlgi alanlarına göre seçilir", "Gerçekten önemsediğin birkaç konuyu seç. Her özet gündemde olana değil, bu profile göre eşleşir."], ["Yalnızca iletilmez, damıtılır", "Sadece bağlantı vermeyiz — kaynağı okur, bilmeye değer tek fikrin kısa ve açık bir özetini yazarız."], ["Kendi dilinde oku", "Özet dilini ve tercih ettiğin kaynak dilini birbirinden bağımsız seç — İngilizce, Türkçe, İspanyolca, Fransızca veya Almanca."], ["İstediğin zaman düzenle", "İlgi alanlarını veya dillerini istediğin zaman değiştir. Ertesi sabahın özeti bunu hemen yansıtır."]] },
  news: { title: "Anlamaya değer tek bir haber.", titleEmphasis: "Haftada üç sabah.", intro: "OneNews sana başlık akışı yerine önemli tek bir haberi anlatır. Her sayı ne olduğunu, neden önemli olduğunu ve bundan sonra neye bakmak gerektiğini — dayandığı kaynaklarla birlikte — ortaya koyar.", maxim: "Tek haber. Onu kavramaya yetecek bağlam. Başka hiçbir şey yok.", tagline: "Akış yok. Bildirim yok. Açıklanmış tek bir haber.", details: [["Her sayıda önemli tek bir haber", "Her şeyi özetlemek yerine her sayı dikkatine değer tek haberi seçer ve baştan sona onunla kalır."], ["Pazartesi, çarşamba ve cuma", "Haftada üç sayı; haber, gün boyu peşinden gelen bir tempoyla değil, takip edebileceğin bir ritimle gelir."], ["Yalnızca başlık değil, bağlam", "Her sayı ne olduğu, neden önemli olduğu ve neye bakılacağı üzerine kurulur — başlığın atladığı kısımlar."], ["İnsan denetiminden geçer ve kurgulanır", "Seçimden, incelemeden ve yayımdan bir editör sorumludur. Gelişen bilgiler tam saatiyle etiketlenir, tartışmalı iddialar yerleşik gerçeklerden ayrı tutulur."], ["Açık kaynaklar ve notlar", "Her sayı, dayandığı kaynaklarla biter; birincil kayıt, haber veya analiz olarak işaretlenir, böylece istediğinde daha ileri gidebilirsin."]] },
  pricing: { eyebrow: "Sade fiyatlandırma · USD", title: "Bir ürünü ya da ikisini birden seç.", intro: "Yıllık ödeme {saving} ve varsayılan olarak seçilidir; aylık değil, yılda bir kez tahsil edilir. Aylık ödeme de kullanılabilir. Deneme süresi yok — örneklerin tamamı açık.", billingLegend: "Ödeme aralığı", annual: "Yıllık", monthly: "Aylık", includedLabel: "Kapsam", cadenceLabel: "Geliş zamanı", choose: "{name} seç", trust: "Ödeme güvenli biçimde Polar üzerinden alınır. Ödeme portalından istediğin zaman iptal edebilirsin. E-posta tercihleri ödemeden ayrıdır." },
  signup: { planTitle: "Zamanına değecek olanı seç", planIntro: "Yıllık ödeme {saving} ve varsayılan olarak seçilidir; yılda bir kez tahsil edilir. İstersen aylığa geçebilirsin.", planGroupLabel: "Bir OneRead planı seç", billingLegend: "Ödeme aralığı", selected: "Seçildi", continueWith: "{name} ile devam et", emailTitle: "{name} aboneliğini başlat", emailIntro: "Tek bir adres ve onu doğrulayacak bir kod. Deneme süresi yok — örneklerin tamamı zaten açık.", emailLabel: "E-posta adresi", emailCta: "Bana kod gönder", emailInvalid: "Geçerli bir e-posta adresi gir.", emailFailed: "Kodu gönderemedik. Lütfen tekrar dene.", verifyTitle: "Gelen kutunu kontrol et", verifyIntro: "{email} adresine altı haneli bir kod gönderdik.", verifyBinding: "Bu kod {plan} planını onaylar — planı değiştirirsen yeni bir kod gerekir.", verifyLabel: "Doğrulama kodu", verifyCta: "E-postayı doğrula", verifyInvalid: "Altı haneli kodu gir.", verifyIncorrect: "Bu kod doğru değil.", verifyFailed: "Kod doğrulanamadı.", languageTitle: "Okuma dilini seç", languageLegend: "Okuma dili", languageIntroBundle: "Tek bir seçim {products} için geçerlidir.", languageIntroSingle: "{name} için tek bir seçim.", languageFailed: "Okuma dilini kaydedemedik.", continue: "Devam et", reviewTitle: "Hazırsın", reviewIntro: "E-posta gönderimi, ödemeyi iptal etmeden sonradan değiştirilebilir.", reviewLanguageLabel: "Okuma dili", checkoutCta: "Güvenli ödemeye devam et", checkoutNote: "Güvenli ödeme portalından istediğin zaman iptal edebilirsin.", checkoutUnavailable: "Ödeme şu anda kullanılamıyor.", planChanged: "Doğrulamandan bu yana planın değişti. Lütfen bu plan için yeni bir kod onayla.", transitionTitle: "Plan değişikliğini onayla", transitionIntro: "Devam etmeden önce bu değişikliği gözden geçir.", transitionPeriodEnd: "Bu değişiklik mevcut ödeme döneminin sonunda geçerli olacak.", transitionProvider: "Zamanlamayı ve kesin tutarı, değişiklik uygulanmadan önce Polar onaylayacak.", transitionCta: "Plan değişikliğini onayla", transitionUnavailable: "Bu plan değişikliği kullanılamıyor.", transitionFailed: "Plan değişikliği tamamlanamadı.", grandfatherNotice: "Mevcut $1 planın kazanılmış haktır. Plan değiştirirsen bu eski fiyat bir daha sunulmayabilir.", grandfatherAcknowledge: "Plan değiştirmenin kazanılmış $1 fiyatımdan vazgeçmek anlamına geldiğini ve geri verilmeyebileceğini anlıyorum.", grandfatherRequired: "Kazanılmış fiyatın kaybedileceğini anladığını onayla." },
  preferences: { title: "OneRead Hesabım", lookupIntro: "Ürünlerini, e-posta gönderimini ve ödemeni yönet.", separation: "Ödeme ile e-posta gönderimi ayrıdır. E-postayı kapatmak ücretli bir planı asla iptal etmez.", emailLabel: "E-posta adresi", emailCta: "Bana kod gönder", emailInvalid: "Geçerli bir e-posta adresi gir.", emailFailed: "Kodu gönderemedik.", verifyTitle: "Gelen kutunu kontrol et", verifyIntro: "{email} adresine altı haneli bir kod gönderdik.", codeLabel: "Doğrulama kodu", codeCta: "Doğrula", codeFailed: "Bu kod doğrulanamadı.", lookupFailed: "Hesabını yükleyemedik.", active: "Etkin", inactive: "Etkin değil", cadenceLabel: "Geliş zamanı", languageLabel: "Okuma dili", languageUnset: "Ayarlanmadı", emailStatusLabel: "E-posta", emailOn: "Açık", emailOff: "Kapalı", emailSuppressed: "Engellendi", turnEmailOff: "E-postayı kapat", resumeEmail: "E-postayı yeniden başlat", suppressed: "Bu adres, sağlayıcı kaynaklı bir güvenlik olayından sonra engellendi. İncelenmesi için destek ile iletişime geç.", updateFailed: "E-posta gönderimini güncelleyemedik.", billingHeading: "Ödeme", intervalLabel: "Ödeme aralığı", stateLabel: "Durum", pendingChange: "{offer} planına geçiliyor, {interval} olarak faturalanacak", grandfathered: "Kazanılmış haklı $1 plan. OneArticle dahil olmayı sürdürür; OneNews sessizce eklenmez.", turnOffAll: "Tüm editoryal e-postaları kapat", manageBilling: "Ödemeyi yönet", viewPlans: "Planları gör", portalUnavailable: "Ödeme portalı şu anda kullanılamıyor." },
  subscribeSuccess: {
    eyebrow: "Ödeme tamamlandı",
    title: "OneRead'i etkinleştiriyoruz.",
    body: "Ödemen tamamlandı. Polar aboneliğini onaylar onaylamaz OneRead'i etkinleştireceğiz.",
    checkoutLabel: "Ödeme {id}",
    cta: "Abonelik durumunu kontrol et",
  },
  unsubscribe: {
    preview: { headline: "Önizleme modu.", body: "Bu bir önizlemedir. Gerçek aboneler şimdi abonelikten çıkarılmış olurdu." },
    notFound: { headline: "Bu aboneliği bulamadık.", body: "Bu beklenmedik bir durumsa herhangi bir OneRead e-postasını yanıtla, düzeltelim." },
    alreadyDone: { headline: "Zaten abonelikten çıkmışsın.", body: "Artık e-posta gelmeyecek. Kendine iyi bak." },
    doneProduct: { headline: "Abonelikten çıktın.", body: "Artık {product} e-postası gelmeyecek. Fikrini değiştirirsen abonelik sayfasından e-postaları yeniden başlatabilirsin." },
    doneGeneric: { headline: "Abonelikten çıktın.", body: "Artık OneRead'den e-posta gelmeyecek. Fikrini değiştirirsen herhangi bir sabah tekrar kaydolabilirsin." },
    error: { headline: "Bir şeyler ters gitti.", body: "Bunu kaydettik. Lütfen tekrar dene ya da herhangi bir OneRead e-postasını yanıtla." },
    tagline: "Tek iyi okuma. Her sabah. Senin için seçildi.",
  },
};

const de: SiteDictionary = {
  common: { backToOneRead: "Zurück zu OneRead", oneReadHome: "OneRead-Startseite", startOneRead: "OneRead starten", includedIn: "Enthalten in", subscriptionCovers: "ein Abo umfasst OneArticle und OneNews." },
  language: { label: "Sprache", menu: "Sprache wählen" },
  footer: { terms: "Bedingungen", privacy: "Datenschutz", pricing: "Preise", navigation: "Fußzeile", feedback: "Feedback-Formular öffnen", manifesto: "Für Menschen, die bessere Impulse wollen, ohne noch eine App zu öffnen.", defaultTagline: "Kein Feed. Kein Lärm. Nur ein guter Text." },
  home: { title: "Eine nützliche E-Mail nach der anderen.", intro: "OneRead bringt kleine, fokussierte Notizen in dein Postfach — OneArticle an Werktagmorgen, OneNews montags, mittwochs und freitags.", tagline: "Kein Feed zum Prüfen. Nur etwas, das sich zu öffnen lohnt." },
  lineUp: { title: "Zwei Produkte. Ein Abo.", intro: "OneArticle kommt an Werktagmorgen, OneNews montags, mittwochs und freitags. Nimm eines einzeln — oder beide zusammen als OneRead.", article: "Artikelbriefing unter der Woche", news: "Nachrichten mit Kontext" },
  article: { title: "Ein Artikel, der lesenswert ist.", titleEmphasis: "Jeden Morgen.", intro: "OneArticle schickt dir jeden Werktagmorgen ein sorgfältig ausgewähltes Artikelbriefing — passend zu deinen Interessen und verdichtet zu einer kurzen, klaren Lektüre. Kein Feed. Keine App.", maxim: "Ein Artikel. Eine Idee, die man kennen sollte. Sonst nichts.", tagline: "Kein Feed. Keine App. Eine gute Lektüre, bevor der Tag laut wird.", details: [["Ein Briefing an jedem Werktagmorgen", "Um 7 Uhr landet ein sorgfältig ausgewählter Artikel in deinem Postfach — in etwa fünf Minuten von Anfang bis Ende gelesen, bevor der Tag laut wird."], ["Nach deinen Interessen ausgewählt", "Wähle einige Themen, die dir wirklich wichtig sind. Jedes Briefing folgt diesem Profil, nicht dem aktuellen Trend."], ["Verdichtet, nicht nur weitergeleitet", "Wir verlinken nicht nur — wir lesen die Quelle und schreiben eine kurze, klare Zusammenfassung der einen wichtigen Idee."], ["In deiner Sprache lesen", "Wähle Zusammenfassungs- und Quellsprache unabhängig voneinander — Englisch, Türkisch, Spanisch, Französisch oder Deutsch."], ["Jederzeit ändern", "Ändere Interessen oder Sprachen, wann du möchtest. Das nächste Briefing berücksichtigt es sofort."]] },
  news: { title: "Eine Geschichte, die man verstehen sollte.", titleEmphasis: "An drei Morgen pro Woche.", intro: "OneNews erklärt eine wichtige Geschichte, statt dir einen Strom von Schlagzeilen zu liefern. Jede Ausgabe legt dar, was geschehen ist, warum es zählt und worauf als Nächstes zu achten ist — samt der Quellen, auf denen sie beruht.", maxim: "Eine Geschichte. Genug Kontext, um sie zu fassen. Sonst nichts.", tagline: "Kein Feed. Keine Alarme. Eine Geschichte, erklärt.", details: [["Eine wichtige Geschichte pro Ausgabe", "Statt alles zusammenzufassen, wählt jede Ausgabe die eine Geschichte aus, die deine Aufmerksamkeit verdient, und bleibt von Anfang bis Ende bei ihr."], ["Montags, mittwochs und freitags", "Drei Ausgaben pro Woche — die Nachrichten kommen in einem Rhythmus, dem du folgen kannst, statt dir den ganzen Tag hinterherzulaufen."], ["Kontext, nicht nur Schlagzeilen", "Jede Ausgabe ist um das gebaut, was geschehen ist, warum es zählt und worauf zu achten ist — genau das, was eine Schlagzeile weglässt."], ["Redaktionell geprüft und strukturiert", "Eine Redaktion verantwortet Auswahl, Prüfung und Veröffentlichung. Sich entwickelnde Informationen werden mit einem genauen Stand-Zeitpunkt gekennzeichnet, strittige Aussagen bleiben von gesicherten Fakten getrennt."], ["Klare Quellen und Anmerkungen", "Jede Ausgabe endet mit ihren Quellen, gekennzeichnet als Primärdokument, Berichterstattung oder Analyse, damit du jederzeit weiterlesen kannst."]] },
  pricing: { eyebrow: "Einfache Preise · USD", title: "Wähle ein Produkt — oder beide.", intro: "Die jährliche Zahlung {saving} und ist voreingestellt; sie wird einmal im Jahr abgebucht, nicht monatlich. Monatliche Zahlung bleibt möglich. Keine Testphase — die vollständigen Beispiele sind offen.", billingLegend: "Abrechnungszeitraum", annual: "Jährlich", monthly: "Monatlich", includedLabel: "Enthalten", cadenceLabel: "Erscheint", choose: "{name} wählen", trust: "Sichere Abrechnung über Polar. Jederzeit über das Abrechnungsportal kündbar. E-Mail-Einstellungen sind von der Abrechnung getrennt." },
  signup: { planTitle: "Wähle, was deine Zeit verdient", planIntro: "Die jährliche Zahlung {saving} und ist voreingestellt; sie wird einmal im Jahr abgebucht. Du kannst zu monatlich wechseln.", planGroupLabel: "Einen OneRead-Tarif wählen", billingLegend: "Abrechnungszeitraum", selected: "Ausgewählt", continueWith: "Mit {name} fortfahren", emailTitle: "{name} starten", emailIntro: "Eine Adresse und ein Code zur Bestätigung. Keine Testphase — die vollständigen Beispiele sind bereits offen.", emailLabel: "E-Mail-Adresse", emailCta: "Code per E-Mail senden", emailInvalid: "Gib eine gültige E-Mail-Adresse ein.", emailFailed: "Wir konnten keinen Code senden. Bitte versuche es erneut.", verifyTitle: "Sieh in dein Postfach", verifyIntro: "Wir haben einen sechsstelligen Code an {email} geschickt.", verifyBinding: "Er bestätigt {plan} — änderst du den Tarif, brauchst du einen neuen Code.", verifyLabel: "Bestätigungscode", verifyCta: "E-Mail bestätigen", verifyInvalid: "Gib den sechsstelligen Code ein.", verifyIncorrect: "Dieser Code stimmt nicht.", verifyFailed: "Der Code konnte nicht bestätigt werden.", languageTitle: "Wähle deine Lesesprache", languageLegend: "Lesesprache", languageIntroBundle: "Eine Wahl gilt für {products}.", languageIntroSingle: "Eine Wahl für {name}.", languageFailed: "Wir konnten deine Lesesprache nicht speichern.", continue: "Weiter", reviewTitle: "Alles bereit", reviewIntro: "Der E-Mail-Versand lässt sich später ändern, ohne die Abrechnung zu kündigen.", reviewLanguageLabel: "Lesesprache", checkoutCta: "Weiter zur sicheren Zahlung", checkoutNote: "Jederzeit über das sichere Abrechnungsportal kündbar.", checkoutUnavailable: "Die Zahlung ist nicht verfügbar.", planChanged: "Dein Tarif hat sich seit der Bestätigung geändert. Bitte bestätige einen neuen Code für diesen Tarif.", transitionTitle: "Tarifwechsel bestätigen", transitionIntro: "Sieh dir diese Änderung an, bevor du fortfährst.", transitionPeriodEnd: "Diese Änderung wird zum Ende deines aktuellen Abrechnungszeitraums wirksam.", transitionProvider: "Polar bestätigt Zeitpunkt und genauen Betrag, bevor diese Änderung angewendet wird.", transitionCta: "Tarifwechsel bestätigen", transitionUnavailable: "Dieser Tarifwechsel ist nicht verfügbar.", transitionFailed: "Der Tarifwechsel konnte nicht abgeschlossen werden.", grandfatherNotice: "Dein aktueller $1 Tarif hat Bestandsschutz. Bei einem Wechsel ist dieser alte Preis womöglich nicht wieder verfügbar.", grandfatherAcknowledge: "Mir ist klar, dass ich mit einem Tarifwechsel meinen bestandsgeschützten $1 Preis aufgebe und er womöglich nicht zurückkommt.", grandfatherRequired: "Bestätige, dass du den Verlust des bestandsgeschützten Preises verstanden hast." },
  preferences: { title: "Mein OneRead", lookupIntro: "Verwalte deine Produkte, den E-Mail-Versand und die Abrechnung.", separation: "Abrechnung und E-Mail-Versand sind getrennt. E-Mails abzuschalten kündigt niemals ein bezahltes Abo.", emailLabel: "E-Mail-Adresse", emailCta: "Code per E-Mail senden", emailInvalid: "Gib eine gültige E-Mail-Adresse ein.", emailFailed: "Wir konnten keinen Code senden.", verifyTitle: "Sieh in dein Postfach", verifyIntro: "Wir haben einen sechsstelligen Code an {email} geschickt.", codeLabel: "Bestätigungscode", codeCta: "Bestätigen", codeFailed: "Dieser Code konnte nicht bestätigt werden.", lookupFailed: "Wir konnten dein Konto nicht laden.", active: "Aktiv", inactive: "Inaktiv", cadenceLabel: "Erscheint", languageLabel: "Lesesprache", languageUnset: "Nicht gesetzt", emailStatusLabel: "E-Mail", emailOn: "An", emailOff: "Aus", emailSuppressed: "Gesperrt", turnEmailOff: "E-Mail abschalten", resumeEmail: "E-Mail fortsetzen", suppressed: "Diese Adresse ist nach einem Sicherheitsereignis des Anbieters gesperrt. Wende dich an den Support, damit sie geprüft wird.", updateFailed: "Wir konnten den E-Mail-Versand nicht aktualisieren.", billingHeading: "Abrechnung", intervalLabel: "Abrechnungszeitraum", stateLabel: "Status", pendingChange: "Wechsel zu {offer}, abgerechnet {interval}", grandfathered: "Bestandsgeschützter $1 Tarif. OneArticle bleibt enthalten; OneNews wird nicht stillschweigend hinzugefügt.", turnOffAll: "Alle redaktionellen E-Mails abschalten", manageBilling: "Abrechnung verwalten", viewPlans: "Tarife ansehen", portalUnavailable: "Das Abrechnungsportal ist derzeit nicht verfügbar." },
  subscribeSuccess: {
    eyebrow: "Bezahlvorgang abgeschlossen",
    title: "Wir aktivieren OneRead.",
    body: "Dein Bezahlvorgang ist abgeschlossen. Wir aktivieren OneRead, sobald Polar dein Abonnement bestätigt hat.",
    checkoutLabel: "Bezahlvorgang {id}",
    cta: "Abonnementstatus prüfen",
  },
  unsubscribe: {
    preview: { headline: "Vorschaumodus.", body: "Dies ist eine Vorschau. Echte Abonnenten wären jetzt abgemeldet." },
    notFound: { headline: "Wir konnten dieses Abonnement nicht finden.", body: "Falls das unerwartet ist, antworte auf eine beliebige OneRead-E-Mail, wir kümmern uns darum." },
    alreadyDone: { headline: "Du bist bereits abgemeldet.", body: "Es werden keine weiteren E-Mails ankommen. Alles Gute." },
    doneProduct: { headline: "Du bist abgemeldet.", body: "Keine {product}-E-Mails mehr. Wenn du deine Meinung änderst, kannst du die E-Mails über die Abo-Seite wieder aktivieren." },
    doneGeneric: { headline: "Du bist abgemeldet.", body: "Keine E-Mails mehr von OneRead. Wenn du deine Meinung änderst, kannst du dich jederzeit wieder anmelden." },
    error: { headline: "Etwas ist schiefgelaufen.", body: "Wir haben das protokolliert. Bitte versuche es erneut oder antworte auf eine beliebige OneRead-E-Mail." },
    tagline: "Eine gute Lektüre. Jeden Morgen. Für dich ausgewählt.",
  },
};

const fr: SiteDictionary = {
  common: { backToOneRead: "Retour à OneRead", oneReadHome: "Accueil OneRead", startOneRead: "Commencer OneRead", includedIn: "Inclus dans", subscriptionCovers: "un abonnement couvre OneArticle et OneNews." },
  language: { label: "Langue", menu: "Choisir la langue" },
  footer: { terms: "Conditions", privacy: "Confidentialité", pricing: "Tarifs", navigation: "Pied de page", feedback: "Ouvrir le formulaire de retour", manifesto: "Pour celles et ceux qui veulent de meilleures sources sans ouvrir une autre application.", defaultTagline: "Aucun fil. Aucun bruit. Juste une bonne lecture." },
  home: { title: "Un e-mail utile à la fois.", intro: "OneRead dépose dans votre boîte de réception de petites notes à usage unique — OneArticle en semaine au matin, OneNews les lundi, mercredi et vendredi.", tagline: "Aucun fil à consulter. Juste quelque chose qui mérite d’être ouvert." },
  lineUp: { title: "Deux produits. Un abonnement.", intro: "OneArticle arrive les matins de semaine, OneNews les lundi, mercredi et vendredi. Prenez l’un séparément, ou les deux avec OneRead.", article: "Un article en semaine", news: "L’actualité expliquée" },
  article: { title: "Un article qui mérite d’être lu.", titleEmphasis: "Chaque matin.", intro: "OneArticle envoie chaque matin de semaine un article soigneusement choisi dans votre boîte de réception — adapté à vos centres d’intérêt et condensé en une lecture courte et claire. Aucun fil à parcourir. Aucune application à ouvrir.", maxim: "Un article. Une idée qui mérite d’être connue. Rien d’autre.", tagline: "Aucun fil. Aucune application. Une bonne lecture avant que la journée ne s’agite.", details: [["Un article chaque matin en semaine", "À 7 h, un article soigneusement choisi arrive dans votre boîte de réception — environ cinq minutes de lecture avant que la journée ne s’agite."], ["Choisi selon vos centres d’intérêt", "Sélectionnez quelques sujets qui comptent vraiment. Chaque article correspond à ce profil, pas aux tendances du moment."], ["Condensé, pas simplement transmis", "Nous ne nous contentons pas d’un lien — nous lisons la source et rédigeons un résumé court et clair de l’idée à retenir."], ["Lisez dans votre langue", "Choisissez indépendamment la langue du résumé et celle des sources — anglais, turc, espagnol, français ou allemand."], ["Modifiez à tout moment", "Changez vos centres d’intérêt ou vos langues quand vous le souhaitez. L’article du lendemain en tient compte immédiatement."]] },
  news: { title: "Une actualité qui mérite d’être comprise.", titleEmphasis: "Trois matins par semaine.", intro: "OneNews explique une actualité importante au lieu de vous livrer un flux de titres. Chaque édition expose ce qui s’est passé, pourquoi cela compte et ce qu’il faut surveiller — avec les sources sur lesquelles elle repose.", maxim: "Une actualité. Assez de contexte pour la saisir. Rien d’autre.", tagline: "Aucun fil. Aucune alerte. Une actualité, expliquée.", details: [["Une actualité importante par édition", "Plutôt que de tout résumer, chaque édition choisit la seule actualité qui mérite votre attention et l’accompagne du début à la fin."], ["Les lundi, mercredi et vendredi", "Trois éditions par semaine : l’actualité arrive à un rythme que vous pouvez suivre, et non à un rythme qui vous poursuit toute la journée."], ["Du contexte, pas seulement des titres", "Chaque édition s’articule autour de ce qui s’est passé, de pourquoi cela compte et de ce qu’il faut surveiller — précisément ce qu’un titre laisse de côté."], ["Relu et structuré par une rédaction", "Une rédaction assume la sélection, la relecture et la publication. Les informations en cours d’évolution portent une heure de mise à jour précise, et les affirmations contestées restent distinctes des faits établis."], ["Des sources et des notes claires", "Chaque édition se termine par les sources qui l’ont nourrie, signalées comme document primaire, reportage ou analyse, pour aller plus loin quand vous le souhaitez."]] },
  pricing: { eyebrow: "Tarifs simples · USD", title: "Choisissez un produit, ou les deux.", intro: "Le paiement annuel {saving} et est sélectionné par défaut ; il est prélevé une fois par an, et non chaque mois. Le paiement mensuel reste disponible. Aucun essai — les exemples complets sont accessibles.", billingLegend: "Périodicité de facturation", annual: "Annuel", monthly: "Mensuel", includedLabel: "Inclus", cadenceLabel: "Réception", choose: "Choisir {name}", trust: "Paiement sécurisé par Polar. Résiliation à tout moment depuis le portail de facturation. Les préférences e-mail sont distinctes de la facturation." },
  signup: { planTitle: "Choisissez ce qui mérite votre temps", planIntro: "Le paiement annuel {saving} et est sélectionné par défaut ; il est prélevé une fois par an. Vous pouvez passer au mensuel.", planGroupLabel: "Choisir une formule OneRead", billingLegend: "Périodicité de facturation", selected: "Sélectionné", continueWith: "Continuer avec {name}", emailTitle: "Commencer {name}", emailIntro: "Une adresse, et un code pour la confirmer. Aucun essai — les exemples complets sont déjà accessibles.", emailLabel: "Adresse e-mail", emailCta: "Envoyez-moi un code", emailInvalid: "Saisissez une adresse e-mail valide.", emailFailed: "Nous n'avons pas pu envoyer de code. Veuillez réessayer.", verifyTitle: "Consultez votre boîte de réception", verifyIntro: "Nous avons envoyé un code à six chiffres à {email}.", verifyBinding: "Il confirme {plan} — si vous changez de formule, il vous faudra un nouveau code.", verifyLabel: "Code de vérification", verifyCta: "Vérifier l'e-mail", verifyInvalid: "Saisissez le code à six chiffres.", verifyIncorrect: "Ce code n'est pas correct.", verifyFailed: "Le code n'a pas pu être vérifié.", languageTitle: "Choisissez votre langue de lecture", languageLegend: "Langue de lecture", languageIntroBundle: "Un seul choix s'applique à {products}.", languageIntroSingle: "Un seul choix pour {name}.", languageFailed: "Nous n'avons pas pu enregistrer votre langue de lecture.", continue: "Continuer", reviewTitle: "Vous êtes prêt", reviewIntro: "L'envoi des e-mails pourra être modifié plus tard sans résilier la facturation.", reviewLanguageLabel: "Langue de lecture", checkoutCta: "Continuer vers le paiement sécurisé", checkoutNote: "Résiliation à tout moment depuis le portail de facturation sécurisé.", checkoutUnavailable: "Le paiement est indisponible.", planChanged: "Votre formule a changé depuis votre vérification. Veuillez confirmer un nouveau code pour cette formule.", transitionTitle: "Confirmer le changement de formule", transitionIntro: "Vérifiez ce changement avant de continuer.", transitionPeriodEnd: "Ce changement prendra effet à la fin de votre période de facturation en cours.", transitionProvider: "Polar confirmera la date et le montant exact avant d'appliquer ce changement.", transitionCta: "Confirmer le changement", transitionUnavailable: "Ce changement de formule n'est pas disponible.", transitionFailed: "Le changement de formule n'a pas pu être effectué.", grandfatherNotice: "Votre formule $1 actuelle est conservée à titre historique. Si vous en changez, cet ancien tarif pourrait ne plus être proposé.", grandfatherAcknowledge: "Je comprends qu'en changeant de formule je renonce à mon tarif historique $1 et qu'il pourrait ne pas être rétabli.", grandfatherRequired: "Confirmez que vous comprenez que le tarif historique sera perdu." },
  preferences: { title: "Mon OneRead", lookupIntro: "Gérez vos produits, l'envoi des e-mails et la facturation.", separation: "La facturation et l'envoi des e-mails sont distincts. Désactiver les e-mails ne résilie jamais un abonnement payant.", emailLabel: "Adresse e-mail", emailCta: "Envoyez-moi un code", emailInvalid: "Saisissez une adresse e-mail valide.", emailFailed: "Nous n'avons pas pu envoyer de code.", verifyTitle: "Consultez votre boîte de réception", verifyIntro: "Nous avons envoyé un code à six chiffres à {email}.", codeLabel: "Code de vérification", codeCta: "Vérifier", codeFailed: "Ce code n'a pas pu être vérifié.", lookupFailed: "Nous n'avons pas pu charger votre compte.", active: "Actif", inactive: "Inactif", cadenceLabel: "Réception", languageLabel: "Langue de lecture", languageUnset: "Non définie", emailStatusLabel: "E-mail", emailOn: "Activé", emailOff: "Désactivé", emailSuppressed: "Bloquée", turnEmailOff: "Désactiver les e-mails", resumeEmail: "Reprendre les e-mails", suppressed: "Cette adresse est bloquée à la suite d'un incident de sécurité chez le prestataire. Contactez le support pour la faire réexaminer.", updateFailed: "Nous n'avons pas pu mettre à jour l'envoi des e-mails.", billingHeading: "Facturation", intervalLabel: "Périodicité de facturation", stateLabel: "État", pendingChange: "Passage à {offer}, facturé {interval}", grandfathered: "Formule $1 conservée à titre historique. OneArticle reste inclus ; OneNews n'est pas ajouté sans le dire.", turnOffAll: "Désactiver tous les e-mails éditoriaux", manageBilling: "Gérer la facturation", viewPlans: "Voir les formules", portalUnavailable: "Le portail de facturation est indisponible pour le moment." },
  subscribeSuccess: {
    eyebrow: "Paiement terminé",
    title: "Nous activons OneRead.",
    body: "Votre paiement est terminé. Nous activerons OneRead dès que Polar aura confirmé votre abonnement.",
    checkoutLabel: "Paiement {id}",
    cta: "Vérifier le statut de l'abonnement",
  },
  unsubscribe: {
    preview: { headline: "Mode aperçu.", body: "Ceci est un aperçu. Les vrais abonnés seraient désormais désabonnés." },
    notFound: { headline: "Nous n'avons pas trouvé cet abonnement.", body: "Si cela vous semble inattendu, répondez à n'importe quel e-mail OneRead et nous corrigerons cela." },
    alreadyDone: { headline: "Vous êtes déjà désabonné(e).", body: "Aucun autre e-mail n'arrivera. Prenez soin de vous." },
    doneProduct: { headline: "Vous êtes désabonné(e).", body: "Plus d'e-mails {product}. Si vous changez d'avis, vous pouvez reprendre les e-mails depuis la page d'abonnement." },
    doneGeneric: { headline: "Vous êtes désabonné(e).", body: "Plus d'e-mails de la part d'OneRead. Si vous changez d'avis, vous pouvez vous réinscrire n'importe quel matin." },
    error: { headline: "Une erreur est survenue.", body: "Nous l'avons enregistrée. Veuillez réessayer, ou répondez à n'importe quel e-mail OneRead." },
    tagline: "Une bonne lecture. Chaque matin. Choisie pour vous.",
  },
};

export const SITE_DICTIONARIES: Record<SiteLocale, SiteDictionary> = {
  en,
  tr,
  de,
  fr,
};
