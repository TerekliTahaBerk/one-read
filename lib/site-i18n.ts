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
