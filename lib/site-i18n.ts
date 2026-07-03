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
    subscriptionCovers: "one subscription covers OneArticle and OneFilm.",
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
      "OneRead brings small, single-purpose notes to your inbox — an article for the morning, a film for the weekend, and more quiet tools as they join the family.",
    priceNote:
      "One subscription. One dollar. Every OneRead product included as the family grows.",
    tagline: "No feed to check. Just something worth opening.",
  },
  family: {
    title: "Meet the OneRead family.",
    intro: "Each one does a single job quietly, then gets out of the way.",
    article: "Weekday article brief",
    film: "Saturday film note",
    comingSoon: "Coming soon — register interest",
  },
  pricing: {
    title: "OneRead is {price}.",
    intro:
      "One subscription includes the whole OneRead family — OneArticle on weekdays and OneFilm on Saturdays.",
    perMonth: "per month",
    included: "One subscription. The whole OneRead family included.",
    features: [
      "OneArticle — one article brief every weekday morning",
      "OneFilm — one film note every Saturday",
      "Edit your preferences anytime",
      "One-click cancel — no questions asked",
    ],
    cta: "Start OneRead",
    trustNotes: ["OneArticle included", "OneFilm included", "No app", "Cancel anytime", "Billing handled securely by Polar"],
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
  film: {
    title: "Stop scrolling for something to watch.",
    titleEmphasis: "Just watch this.",
    intro:
      "OneFilm sends you one film every Saturday — why it's worth watching, what mood it suits, and what to know before you press play — in a short, spoiler-light note.",
    maxim: "One film. One short note. One reason worth watching.",
    tagline: "One film. One short note. One reason worth watching.",
    details: [
      ["One film note, every Saturday", "No browsing, no endless scrolling through a streaming menu. One thoughtfully chosen film arrives with a short note on why it's worth your evening."],
      ["Chosen for mood, not trends", "Every pick is matched to what a quiet evening actually calls for — not to what's popular this week or which algorithm is pushing it."],
      ["Spoiler-light, on purpose", "The note tells you enough to decide — tone, mood, why it's worth watching — and never gives away what should stay a surprise."],
      ["Real, grounded recommendations", "No invented ratings, no fake availability claims. Only what's genuinely known about the film makes it into the note."],
      ["Edit anytime", "Change your genres, moods, or spoiler preference whenever you like. It's reflected in the very next note."],
    ],
  },
};

export type SiteDictionary = typeof en;

const tr: SiteDictionary = {
  common: { backToOneRead: "OneRead’e dön", oneReadHome: "OneRead ana sayfası", startOneRead: "OneRead’i başlat", includedIn: "Şuna dahil:", subscriptionCovers: "tek abonelik OneArticle ve OneFilm’i kapsar." },
  language: { label: "Dil", menu: "Dil seç" },
  footer: { terms: "Koşullar", privacy: "Gizlilik", pricing: "Fiyatlandırma", navigation: "Alt menü", feedback: "Geri bildirim formunu aç", manifesto: "Daha iyi içerik isteyen ama açacak yeni bir uygulama istemeyenler için.", defaultTagline: "Akış yok. Gürültü yok. Yalnızca iyi bir okuma." },
  home: { title: "Her seferinde tek bir faydalı e-posta.", intro: "OneRead, küçük ve tek amaçlı notları gelen kutuna getirir — sabah için bir makale, hafta sonu için bir film ve aileye katıldıkça daha fazla sakin araç.", priceNote: "Tek abonelik. Bir dolar. Aile büyüdükçe her OneRead ürünü dahil.", tagline: "Kontrol edilecek bir akış yok. Yalnızca açmaya değer bir şey." },
  family: { title: "OneRead ailesiyle tanış.", intro: "Her biri tek bir işi sessizce yapar, sonra aradan çekilir.", article: "Hafta içi makale özeti", film: "Cumartesi film notu", comingSoon: "Yakında — ilgini bildir" },
  pricing: { title: "OneRead {price}.", intro: "Tek abonelik tüm OneRead ailesini kapsar — hafta içi OneArticle, cumartesileri OneFilm.", perMonth: "aylık", included: "Tek abonelik. Tüm OneRead ailesi dahil.", features: ["OneArticle — hafta içi her sabah tek makale özeti", "OneFilm — her cumartesi tek film notu", "Tercihlerini istediğin zaman düzenle", "Tek tıkla iptal — soru yok"], cta: "OneRead’i başlat", trustNotes: ["OneArticle dahil", "OneFilm dahil", "Uygulama yok", "İstediğin zaman iptal et", "Ödeme Polar tarafından güvenle işlenir"] },
  article: { title: "Okumaya değer tek bir makale.", titleEmphasis: "Her sabah.", intro: "OneArticle, ilgi alanlarına göre seçilmiş tek bir makale özetini hafta içi her sabah gelen kutuna gönderir; kısa ve açık bir okumaya dönüştürür. Kaydırılacak akış yok. Açılacak uygulama yok.", maxim: "Tek makale. Bilmeye değer tek fikir. Başka hiçbir şey yok.", tagline: "Akış yok. Uygulama yok. Gün gürültüye dönüşmeden tek iyi okuma.", details: [["Hafta içi her sabah tek özet", "Saat 07.00’de özenle seçilmiş tek bir makale gelen kutuna düşer — günün geri kalanı gürültüye dönüşmeden yaklaşık beş dakikada baştan sona okunur."], ["İlgi alanlarına göre seçilir", "Gerçekten önemsediğin birkaç konuyu seç. Her özet gündemde olana değil, bu profile göre eşleşir."], ["Yalnızca iletilmez, damıtılır", "Sadece bağlantı vermeyiz — kaynağı okur, bilmeye değer tek fikrin kısa ve açık bir özetini yazarız."], ["Kendi dilinde oku", "Özet dilini ve tercih ettiğin kaynak dilini birbirinden bağımsız seç — İngilizce, Türkçe, İspanyolca, Fransızca veya Almanca."], ["İstediğin zaman düzenle", "İlgi alanlarını veya dillerini istediğin zaman değiştir. Ertesi sabahın özeti bunu hemen yansıtır."]] },
  film: { title: "İzleyecek bir şey bulmak için kaydırmayı bırak.", titleEmphasis: "Sadece bunu izle.", intro: "OneFilm her cumartesi sana tek bir film gönderir — neden izlemeye değer olduğu, hangi ruh hâline uyduğu ve oynat tuşuna basmadan önce bilmen gerekenler, kısa ve spoiler vermeyen bir notta.", maxim: "Tek film. Tek kısa not. İzlemeye değer tek neden.", tagline: "Tek film. Tek kısa not. İzlemeye değer tek neden.", details: [["Her cumartesi tek film notu", "Göz gezdirmek yok, yayın menüsünde sonsuz kaydırma yok. Özenle seçilmiş tek film, akşamına neden değeceğini anlatan kısa bir notla gelir."], ["Trendlere değil, ruh hâline göre", "Her seçim, bu hafta neyin popüler olduğuna değil, sakin bir akşamın gerçekten ne istediğine göre eşleşir."], ["Bilerek spoiler vermez", "Not karar vermene yetecek kadarını söyler — ton, his ve neden izlemeye değer olduğu — ama sürpriz kalması gerekeni asla açıklamaz."], ["Gerçek, temeli olan öneriler", "Uydurma puanlar ve sahte erişilebilirlik iddiaları yok. Nota yalnızca film hakkında gerçekten bilinenler girer."], ["İstediğin zaman düzenle", "Türlerini, ruh hâllerini veya spoiler tercihini istediğin zaman değiştir. Bir sonraki nota hemen yansır."]] },
};

const de: SiteDictionary = {
  common: { backToOneRead: "Zurück zu OneRead", oneReadHome: "OneRead-Startseite", startOneRead: "OneRead starten", includedIn: "Enthalten in", subscriptionCovers: "ein Abo umfasst OneArticle und OneFilm." },
  language: { label: "Sprache", menu: "Sprache wählen" },
  footer: { terms: "Bedingungen", privacy: "Datenschutz", pricing: "Preise", navigation: "Fußzeile", feedback: "Feedback-Formular öffnen", manifesto: "Für Menschen, die bessere Impulse wollen, ohne noch eine App zu öffnen.", defaultTagline: "Kein Feed. Kein Lärm. Nur ein guter Text." },
  home: { title: "Eine nützliche E-Mail nach der anderen.", intro: "OneRead bringt kleine, fokussierte Notizen in dein Postfach — einen Artikel für den Morgen, einen Film fürs Wochenende und weitere ruhige Werkzeuge, sobald sie zur Familie stoßen.", priceNote: "Ein Abo. Ein Dollar. Jedes OneRead-Produkt ist dabei, während die Familie wächst.", tagline: "Kein Feed zum Prüfen. Nur etwas, das sich zu öffnen lohnt." },
  family: { title: "Lerne die OneRead-Familie kennen.", intro: "Jedes Mitglied erledigt leise eine einzige Aufgabe und tritt dann beiseite.", article: "Artikelbriefing unter der Woche", film: "Filmnotiz am Samstag", comingSoon: "Demnächst — Interesse anmelden" },
  pricing: { title: "OneRead kostet {price}.", intro: "Ein Abo umfasst die gesamte OneRead-Familie — OneArticle unter der Woche und OneFilm am Samstag.", perMonth: "pro Monat", included: "Ein Abo. Die gesamte OneRead-Familie ist enthalten.", features: ["OneArticle — jeden Werktagmorgen ein Artikelbriefing", "OneFilm — jeden Samstag eine Filmnotiz", "Präferenzen jederzeit ändern", "Mit einem Klick kündigen — ohne Fragen"], cta: "OneRead starten", trustNotes: ["OneArticle enthalten", "OneFilm enthalten", "Keine App", "Jederzeit kündbar", "Sichere Zahlungsabwicklung durch Polar"] },
  article: { title: "Ein Artikel, der lesenswert ist.", titleEmphasis: "Jeden Morgen.", intro: "OneArticle schickt dir jeden Werktagmorgen ein sorgfältig ausgewähltes Artikelbriefing — passend zu deinen Interessen und verdichtet zu einer kurzen, klaren Lektüre. Kein Feed. Keine App.", maxim: "Ein Artikel. Eine Idee, die man kennen sollte. Sonst nichts.", tagline: "Kein Feed. Keine App. Eine gute Lektüre, bevor der Tag laut wird.", details: [["Ein Briefing an jedem Werktagmorgen", "Um 7 Uhr landet ein sorgfältig ausgewählter Artikel in deinem Postfach — in etwa fünf Minuten von Anfang bis Ende gelesen, bevor der Tag laut wird."], ["Nach deinen Interessen ausgewählt", "Wähle einige Themen, die dir wirklich wichtig sind. Jedes Briefing folgt diesem Profil, nicht dem aktuellen Trend."], ["Verdichtet, nicht nur weitergeleitet", "Wir verlinken nicht nur — wir lesen die Quelle und schreiben eine kurze, klare Zusammenfassung der einen wichtigen Idee."], ["In deiner Sprache lesen", "Wähle Zusammenfassungs- und Quellsprache unabhängig voneinander — Englisch, Türkisch, Spanisch, Französisch oder Deutsch."], ["Jederzeit ändern", "Ändere Interessen oder Sprachen, wann du möchtest. Das nächste Briefing berücksichtigt es sofort."]] },
  film: { title: "Hör auf, nach etwas zum Anschauen zu scrollen.", titleEmphasis: "Schau einfach das.", intro: "OneFilm schickt dir jeden Samstag einen Film — warum er sehenswert ist, zu welcher Stimmung er passt und was du vor dem Start wissen solltest — in einer kurzen, spoilerarmen Notiz.", maxim: "Ein Film. Eine kurze Notiz. Ein guter Grund, ihn zu sehen.", tagline: "Ein Film. Eine kurze Notiz. Ein guter Grund, ihn zu sehen.", details: [["Jeden Samstag eine Filmnotiz", "Kein Suchen, kein endloses Scrollen im Streaming-Menü. Ein durchdacht ausgewählter Film kommt mit einer kurzen Notiz darüber, warum er deinen Abend wert ist."], ["Nach Stimmung, nicht nach Trends", "Jede Wahl passt zu dem, was ein ruhiger Abend wirklich braucht — nicht zu aktuellen Trends oder Algorithmen."], ["Bewusst spoilerarm", "Die Notiz sagt genug für deine Entscheidung — Ton, Stimmung und warum der Film sehenswert ist — ohne Überraschungen zu verraten."], ["Echte, fundierte Empfehlungen", "Keine erfundenen Bewertungen, keine falschen Verfügbarkeiten. Nur verlässliche Informationen gelangen in die Notiz."], ["Jederzeit ändern", "Ändere Genres, Stimmungen oder Spoiler-Präferenz jederzeit. Schon die nächste Notiz berücksichtigt es."]] },
};

const fr: SiteDictionary = {
  common: { backToOneRead: "Retour à OneRead", oneReadHome: "Accueil OneRead", startOneRead: "Commencer OneRead", includedIn: "Inclus dans", subscriptionCovers: "un abonnement couvre OneArticle et OneFilm." },
  language: { label: "Langue", menu: "Choisir la langue" },
  footer: { terms: "Conditions", privacy: "Confidentialité", pricing: "Tarifs", navigation: "Pied de page", feedback: "Ouvrir le formulaire de retour", manifesto: "Pour celles et ceux qui veulent de meilleures sources sans ouvrir une autre application.", defaultTagline: "Aucun fil. Aucun bruit. Juste une bonne lecture." },
  home: { title: "Un e-mail utile à la fois.", intro: "OneRead dépose dans votre boîte de réception de petites notes à usage unique — un article pour le matin, un film pour le week-end et d’autres outils discrets à mesure que la famille s’agrandit.", priceNote: "Un abonnement. Un dollar. Chaque produit OneRead est inclus à mesure que la famille grandit.", tagline: "Aucun fil à consulter. Juste quelque chose qui mérite d’être ouvert." },
  family: { title: "Découvrez la famille OneRead.", intro: "Chacun accomplit discrètement une seule tâche, puis s’efface.", article: "Un article en semaine", film: "Une note cinéma le samedi", comingSoon: "Bientôt — manifester votre intérêt" },
  pricing: { title: "OneRead coûte {price}.", intro: "Un abonnement inclut toute la famille OneRead — OneArticle en semaine et OneFilm le samedi.", perMonth: "par mois", included: "Un abonnement. Toute la famille OneRead est incluse.", features: ["OneArticle — un article chaque matin en semaine", "OneFilm — une note cinéma chaque samedi", "Modifiez vos préférences à tout moment", "Résiliation en un clic — sans questions"], cta: "Commencer OneRead", trustNotes: ["OneArticle inclus", "OneFilm inclus", "Aucune application", "Résiliez à tout moment", "Paiement sécurisé par Polar"] },
  article: { title: "Un article qui mérite d’être lu.", titleEmphasis: "Chaque matin.", intro: "OneArticle envoie chaque matin de semaine un article soigneusement choisi dans votre boîte de réception — adapté à vos centres d’intérêt et condensé en une lecture courte et claire. Aucun fil à parcourir. Aucune application à ouvrir.", maxim: "Un article. Une idée qui mérite d’être connue. Rien d’autre.", tagline: "Aucun fil. Aucune application. Une bonne lecture avant que la journée ne s’agite.", details: [["Un article chaque matin en semaine", "À 7 h, un article soigneusement choisi arrive dans votre boîte de réception — environ cinq minutes de lecture avant que la journée ne s’agite."], ["Choisi selon vos centres d’intérêt", "Sélectionnez quelques sujets qui comptent vraiment. Chaque article correspond à ce profil, pas aux tendances du moment."], ["Condensé, pas simplement transmis", "Nous ne nous contentons pas d’un lien — nous lisons la source et rédigeons un résumé court et clair de l’idée à retenir."], ["Lisez dans votre langue", "Choisissez indépendamment la langue du résumé et celle des sources — anglais, turc, espagnol, français ou allemand."], ["Modifiez à tout moment", "Changez vos centres d’intérêt ou vos langues quand vous le souhaitez. L’article du lendemain en tient compte immédiatement."]] },
  film: { title: "Arrêtez de faire défiler pour trouver quoi regarder.", titleEmphasis: "Regardez simplement ceci.", intro: "OneFilm vous envoie un film chaque samedi — pourquoi il mérite d’être vu, à quelle humeur il correspond et ce qu’il faut savoir avant de lancer la lecture — dans une note courte et sans spoiler.", maxim: "Un film. Une courte note. Une bonne raison de le voir.", tagline: "Un film. Une courte note. Une bonne raison de le voir.", details: [["Une note cinéma chaque samedi", "Aucune recherche, aucun défilement sans fin dans un catalogue. Un film choisi avec soin arrive avec une courte note expliquant pourquoi il mérite votre soirée."], ["Choisi selon l’humeur, pas les tendances", "Chaque choix répond à ce qu’une soirée tranquille demande vraiment — pas à la mode de la semaine ni aux algorithmes."], ["Sans spoiler, volontairement", "La note en dit assez pour décider — ton, ambiance et intérêt du film — sans révéler ce qui doit rester une surprise."], ["Des recommandations réelles et solides", "Aucune note inventée, aucune fausse disponibilité. Seules les informations réellement connues figurent dans la note."], ["Modifiez à tout moment", "Changez vos genres, humeurs ou préférences de spoilers quand vous le souhaitez. La note suivante en tient compte."]] },
};

export const SITE_DICTIONARIES: Record<SiteLocale, SiteDictionary> = {
  en,
  tr,
  de,
  fr,
};
