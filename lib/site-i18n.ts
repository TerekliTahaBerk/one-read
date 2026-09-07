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
  // Heads the offer cards the homepage renders from the registry. Names the
  // two products and the bundle rather than a "family", which was planning-era
  // vocabulary for a line-up that was never built.
  lineUp: {
    title: "Two products. One subscription.",
    intro:
      "OneArticle arrives on weekday mornings, OneNews on Monday, Wednesday, and Friday. Take either on its own, or take both as OneRead.",
    article: "Weekday article brief",
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
  lineUp: { title: "İki ürün. Tek abonelik.", intro: "OneArticle hafta içi sabahları, OneNews pazartesi, çarşamba ve cuma günleri gelir. Birini tek başına al ya da ikisini birden OneRead ile al.", article: "Hafta içi makale özeti" },
  article: { title: "Okumaya değer tek bir makale.", titleEmphasis: "Her sabah.", intro: "OneArticle, ilgi alanlarına göre seçilmiş tek bir makale özetini hafta içi her sabah gelen kutuna gönderir; kısa ve açık bir okumaya dönüştürür. Kaydırılacak akış yok. Açılacak uygulama yok.", maxim: "Tek makale. Bilmeye değer tek fikir. Başka hiçbir şey yok.", tagline: "Akış yok. Uygulama yok. Gün gürültüye dönüşmeden tek iyi okuma.", details: [["Hafta içi her sabah tek özet", "Saat 07.00’de özenle seçilmiş tek bir makale gelen kutuna düşer — günün geri kalanı gürültüye dönüşmeden yaklaşık beş dakikada baştan sona okunur."], ["İlgi alanlarına göre seçilir", "Gerçekten önemsediğin birkaç konuyu seç. Her özet gündemde olana değil, bu profile göre eşleşir."], ["Yalnızca iletilmez, damıtılır", "Sadece bağlantı vermeyiz — kaynağı okur, bilmeye değer tek fikrin kısa ve açık bir özetini yazarız."], ["Kendi dilinde oku", "Özet dilini ve tercih ettiğin kaynak dilini birbirinden bağımsız seç — İngilizce, Türkçe, İspanyolca, Fransızca veya Almanca."], ["İstediğin zaman düzenle", "İlgi alanlarını veya dillerini istediğin zaman değiştir. Ertesi sabahın özeti bunu hemen yansıtır."]] },
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
  lineUp: { title: "Zwei Produkte. Ein Abo.", intro: "OneArticle kommt an Werktagmorgen, OneNews montags, mittwochs und freitags. Nimm eines einzeln — oder beide zusammen als OneRead.", article: "Artikelbriefing unter der Woche" },
  article: { title: "Ein Artikel, der lesenswert ist.", titleEmphasis: "Jeden Morgen.", intro: "OneArticle schickt dir jeden Werktagmorgen ein sorgfältig ausgewähltes Artikelbriefing — passend zu deinen Interessen und verdichtet zu einer kurzen, klaren Lektüre. Kein Feed. Keine App.", maxim: "Ein Artikel. Eine Idee, die man kennen sollte. Sonst nichts.", tagline: "Kein Feed. Keine App. Eine gute Lektüre, bevor der Tag laut wird.", details: [["Ein Briefing an jedem Werktagmorgen", "Um 7 Uhr landet ein sorgfältig ausgewählter Artikel in deinem Postfach — in etwa fünf Minuten von Anfang bis Ende gelesen, bevor der Tag laut wird."], ["Nach deinen Interessen ausgewählt", "Wähle einige Themen, die dir wirklich wichtig sind. Jedes Briefing folgt diesem Profil, nicht dem aktuellen Trend."], ["Verdichtet, nicht nur weitergeleitet", "Wir verlinken nicht nur — wir lesen die Quelle und schreiben eine kurze, klare Zusammenfassung der einen wichtigen Idee."], ["In deiner Sprache lesen", "Wähle Zusammenfassungs- und Quellsprache unabhängig voneinander — Englisch, Türkisch, Spanisch, Französisch oder Deutsch."], ["Jederzeit ändern", "Ändere Interessen oder Sprachen, wann du möchtest. Das nächste Briefing berücksichtigt es sofort."]] },
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
  lineUp: { title: "Deux produits. Un abonnement.", intro: "OneArticle arrive les matins de semaine, OneNews les lundi, mercredi et vendredi. Prenez l’un séparément, ou les deux avec OneRead.", article: "Un article en semaine" },
  article: { title: "Un article qui mérite d’être lu.", titleEmphasis: "Chaque matin.", intro: "OneArticle envoie chaque matin de semaine un article soigneusement choisi dans votre boîte de réception — adapté à vos centres d’intérêt et condensé en une lecture courte et claire. Aucun fil à parcourir. Aucune application à ouvrir.", maxim: "Un article. Une idée qui mérite d’être connue. Rien d’autre.", tagline: "Aucun fil. Aucune application. Une bonne lecture avant que la journée ne s’agite.", details: [["Un article chaque matin en semaine", "À 7 h, un article soigneusement choisi arrive dans votre boîte de réception — environ cinq minutes de lecture avant que la journée ne s’agite."], ["Choisi selon vos centres d’intérêt", "Sélectionnez quelques sujets qui comptent vraiment. Chaque article correspond à ce profil, pas aux tendances du moment."], ["Condensé, pas simplement transmis", "Nous ne nous contentons pas d’un lien — nous lisons la source et rédigeons un résumé court et clair de l’idée à retenir."], ["Lisez dans votre langue", "Choisissez indépendamment la langue du résumé et celle des sources — anglais, turc, espagnol, français ou allemand."], ["Modifiez à tout moment", "Changez vos centres d’intérêt ou vos langues quand vous le souhaitez. L’article du lendemain en tient compte immédiatement."]] },
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
