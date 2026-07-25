"use client";

import { Fragment } from "react";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";

const COPY = {
  en: {
    title: "Editorial standards",
    updated: "July 25, 2026",
    intro: "OneRead is an independent editorial project operated from Türkiye. Every edition is prepared, reviewed, and explicitly scheduled by a human editor.",
    sections: [
      ["How OneArticle is chosen", "We favor useful ideas with lasting relevance over breaking-news volume. A candidate must come from an identifiable source, make a specific claim worth understanding, and support a concise reading guide without replacing the original.", ["Source authority and traceability", "Usefulness beyond the day’s headline", "A clear central idea", "Enough evidence to link readers back to the original"]],
      ["How OneFilm is chosen", "OneFilm is selected for the experience it offers, not for what an algorithm is promoting. We consider mood, artistic merit, accessibility, and whether we can verify the essential film facts. We do not invent ratings or availability claims.", ["A clear reason to watch now", "Mood and pacing described without spoilers", "Director, year, language, and runtime checked", "No platform claim unless it can be verified"]],
      ["The publishing workflow", "Each edition follows the same controlled path before it can reach an inbox.", ["Choose and record the source", "Write the original editorial note", "Check claims, links, image credit, and accessibility text", "Preview the exact email", "Approve and schedule it manually"]],
      ["How software and AI are used", "Production editions are not autonomously generated or sent by AI. Software tools may assist research, formatting, translation checks, and quality control. Subscriber email addresses are not provided to content-generation tools, and no edition is delivered without a human scheduling decision.", []],
      ["Corrections and accountability", "If we get something wrong, email hello@oneread.email. We review correction requests against the cited source and update our process when a mistake reveals a broader gap.", []],
    ],
    samples: "See the actual format before subscribing:",
    article: "Full OneArticle sample",
    film: "Full OneFilm sample",
  },
  tr: {
    title: "Editoryal standartlar",
    updated: "25 Temmuz 2026",
    intro: "OneRead, Türkiye’den işletilen bağımsız bir editoryal projedir. Her gönderi bir insan editör tarafından hazırlanır, kontrol edilir ve açıkça zamanlanır.",
    sections: [
      ["OneArticle nasıl seçilir?", "Son dakika yoğunluğu yerine kalıcı fayda taşıyan fikirleri tercih ederiz. Aday içerik açık bir kaynağa, anlamaya değer belirli bir iddiaya ve okuru asıl esere yönlendirecek yeterli kanıta sahip olmalıdır.", ["Kaynağın güvenilirliği ve izlenebilirliği", "Günün başlığının ötesinde fayda", "Açık bir ana fikir", "Özgün kaynağa bağlantı verecek yeterli kanıt"]],
      ["OneFilm nasıl seçilir?", "OneFilm algoritmaların öne çıkardığına göre değil, sunduğu deneyime göre seçilir. Ruh hâli, sanatsal değer, erişilebilirlik ve temel film bilgilerinin doğrulanabilirliğini değerlendiririz.", ["Şimdi izlemek için açık bir neden", "Spoiler vermeden ruh hâli ve tempo", "Yönetmen, yıl, dil ve süre kontrolü", "Doğrulanamayan platform veya puan iddiası yok"]],
      ["Yayın akışı", "Her gönderi gelen kutusuna ulaşmadan önce aynı kontrollü süreçten geçer.", ["Kaynağı seç ve kaydet", "Özgün editoryal notu yaz", "İddia, bağlantı, görsel kredisi ve erişilebilirlik metnini kontrol et", "E-postanın birebir önizlemesini incele", "Manuel olarak onayla ve zamanla"]],
      ["Yazılım ve yapay zekâ kullanımı", "Canlı gönderiler yapay zekâ tarafından otonom biçimde üretilmez veya gönderilmez. Araçlar araştırma, biçimlendirme, çeviri kontrolü ve kalite güvencesine yardımcı olabilir. Abone e-posta adresleri içerik üretim araçlarına verilmez ve insan tarafından zamanlama kararı olmadan hiçbir gönderi yollanmaz.", []],
      ["Düzeltmeler ve hesap verebilirlik", "Bir hata görürseniz hello@oneread.email adresine yazın. Düzeltme taleplerini kaynakla karşılaştırır ve hata daha geniş bir boşluğu gösteriyorsa sürecimizi güncelleriz.", []],
    ],
    samples: "Abone olmadan önce gerçek formatı görün:",
    article: "Tam OneArticle örneği",
    film: "Tam OneFilm örneği",
  },
  de: {
    title: "Redaktionelle Standards",
    updated: "25. Juli 2026",
    intro: "OneRead ist ein unabhängiges redaktionelles Projekt aus Türkiye. Jede Ausgabe wird von einem menschlichen Redakteur vorbereitet, geprüft und ausdrücklich geplant.",
    sections: [
      ["Auswahl für OneArticle", "Wir bevorzugen dauerhaft nützliche Ideen gegenüber Nachrichtenvolumen. Jede Auswahl braucht eine erkennbare Quelle, eine konkrete Aussage und genügend Belege für einen knappen Leseleitfaden.", ["Nachvollziehbare, verlässliche Quelle", "Nutzen über die Tagesmeldung hinaus", "Klare Kernidee", "Link zum Original"]],
      ["Auswahl für OneFilm", "OneFilm folgt dem Filmerlebnis, nicht algorithmischer Werbung. Stimmung, künstlerischer Wert und überprüfbare Filmdaten stehen im Mittelpunkt.", ["Klarer Grund zum Anschauen", "Stimmung ohne Spoiler", "Regie, Jahr, Sprache und Laufzeit geprüft", "Keine erfundenen Bewertungen oder Verfügbarkeiten"]],
      ["Veröffentlichungsablauf", "Jede Ausgabe durchläuft vor dem Versand denselben kontrollierten Weg.", ["Quelle dokumentieren", "Originale redaktionelle Notiz schreiben", "Aussagen, Links, Bildnachweis und Alt-Text prüfen", "Exakte E-Mail-Vorschau prüfen", "Manuell freigeben und planen"]],
      ["Software und KI", "Produktionsausgaben werden nicht autonom von KI erstellt oder versendet. Werkzeuge können Recherche, Formatierung und Qualitätskontrolle unterstützen. Abonnentenadressen werden nicht an Inhaltsgeneratoren weitergegeben.", []],
      ["Korrekturen", "Melden Sie Fehler an hello@oneread.email. Wir prüfen Hinweise anhand der zitierten Quelle und verbessern unseren Prozess.", []],
    ],
    samples: "Sehen Sie das echte Format vor dem Abonnement:",
    article: "Vollständiges OneArticle-Beispiel",
    film: "Vollständiges OneFilm-Beispiel",
  },
  fr: {
    title: "Normes éditoriales",
    updated: "25 juillet 2026",
    intro: "OneRead est un projet éditorial indépendant exploité depuis la Türkiye. Chaque édition est préparée, vérifiée et programmée explicitement par un éditeur humain.",
    sections: [
      ["Sélection OneArticle", "Nous privilégions les idées utiles et durables plutôt que le volume d'actualité. Chaque choix doit avoir une source identifiable, une affirmation précise et suffisamment de preuves pour renvoyer vers l'original.", ["Source fiable et traçable", "Utilité au-delà du titre du jour", "Idée centrale claire", "Lien vers l'œuvre originale"]],
      ["Sélection OneFilm", "OneFilm est choisi pour l'expérience proposée, non pour la promotion d'un algorithme. Nous évaluons l'ambiance, la valeur artistique et les faits vérifiables.", ["Une raison claire de regarder", "Ambiance décrite sans spoiler", "Réalisateur, année, langue et durée vérifiés", "Aucune note ou disponibilité inventée"]],
      ["Processus de publication", "Chaque édition suit le même parcours contrôlé avant l'envoi.", ["Choisir et noter la source", "Rédiger la note éditoriale originale", "Vérifier faits, liens, crédit image et texte alternatif", "Examiner l'aperçu exact", "Valider et programmer manuellement"]],
      ["Logiciels et IA", "Les éditions ne sont ni générées ni envoyées de manière autonome par l'IA. Des outils peuvent aider la recherche, la mise en forme et le contrôle qualité. Les adresses des abonnés ne sont pas transmises aux outils de génération.", []],
      ["Corrections", "Signalez toute erreur à hello@oneread.email. Nous vérifions la demande avec la source citée et améliorons notre processus.", []],
    ],
    samples: "Consultez le vrai format avant de vous abonner :",
    article: "Exemple OneArticle complet",
    film: "Exemple OneFilm complet",
  },
} as const;

export function EditorialStandardsContent() {
  const { locale, dictionary } = useSiteLanguage();
  const copy = COPY[locale];
  return (
    <LegalLayout
      title={copy.title}
      lastUpdated={copy.updated}
      backLabel={dictionary.common.backToOneRead}
      ariaLabel={dictionary.common.oneReadHome}
    >
      <p>{copy.intro}</p>
      {copy.sections.map(([heading, paragraph, items]) => (
        <Fragment key={heading}>
          <h2>{heading}</h2>
          <p>{paragraph}</p>
          {items.length > 0 && <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>}
        </Fragment>
      ))}
      <h2>{copy.samples}</h2>
      <ul>
        <li><Link href="/samples/article">{copy.article}</Link></li>
        <li><Link href="/samples/film">{copy.film}</Link></li>
      </ul>
    </LegalLayout>
  );
}
