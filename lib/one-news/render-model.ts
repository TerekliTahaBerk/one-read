import { htmlLangFor, localeFor } from "@/lib/i18n";
import {
  editorialTextToHtml,
  editorialTextToPlainText,
} from "@/lib/editorial/formatting";
import { isSafeHttpUrl } from "@/lib/editorial/url-safety";
import { countWords, ONE_NEWS_WORDS_PER_MINUTE } from "./validation";

/**
 * The canonical OneNews render model.
 *
 * Every surface that shows an edition — the HTML email, the plain-text email
 * and the admin preview — consumes this, never a raw Prisma row. That is what
 * makes the preview exact: there is only one place where an edition is turned
 * into display content, and all three call it.
 */

export type OneNewsSectionKey =
  | "whatHappened"
  | "whyItMatters"
  | "whatsContested"
  | "whatToWatch";

export interface OneNewsRenderSection {
  key: OneNewsSectionKey;
  label: string;
  html: string;
  text: string;
}

export interface OneNewsRenderSource {
  /** 1-based, matching the numbering the reader sees. */
  position: number;
  url: string;
  title: string;
  publication: string;
  sourceType: string;
  typeLabel: string;
  isPrimary: boolean;
  dateLabel: string | null;
  note: string | null;
}

export interface OneNewsRenderCorrection {
  type: string;
  label: string;
  note: string;
  dateLabel: string;
  isMaterial: boolean;
}

export interface OneNewsRenderModel {
  language: string;
  htmlLang: string;
  locale: string;
  subject: string;
  previewText: string | null;
  headline: string;
  dek: string;
  dateLabel: string;
  readingLabel: string;
  wordCount: number;
  sections: OneNewsRenderSection[];
  developing: boolean;
  /** Exact, localized date *and* time — never "as of today". */
  asOfLabel: string | null;
  asOfIso: string | null;
  developingNotice: string | null;
  sources: OneNewsRenderSource[];
  corrections: OneNewsRenderCorrection[];
  closing: string;
  labels: OneNewsLabels;
}

export interface OneNewsRenderIssue {
  readingLanguage: string;
  timezone: string;
  subject: string;
  previewText: string | null;
  headline: string;
  dek: string;
  whatHappened: string;
  whyItMatters: string;
  whatsContested: string | null;
  whatToWatch: string;
  developing: boolean;
  asOf: Date | null;
  scheduledFor: Date | null;
  sentAt?: Date | null;
}

export interface OneNewsRenderSourceRow {
  url: string;
  title: string;
  publication: string;
  sourceType: string;
  publishedAt: Date | null;
  note: string | null;
  sortOrder: number;
}

export interface OneNewsRenderCorrectionRow {
  type: string;
  note: string;
  createdAt: Date;
}

export function buildOneNewsRenderModel(
  issue: OneNewsRenderIssue,
  sources: readonly OneNewsRenderSourceRow[] = [],
  corrections: readonly OneNewsRenderCorrectionRow[] = [],
): OneNewsRenderModel {
  const labels = oneNewsLabels(issue.readingLanguage);
  const locale = localeFor(issue.readingLanguage);
  const timeZone = issue.timezone || "Europe/Istanbul";
  const date = issue.sentAt ?? issue.scheduledFor ?? new Date();

  const contested = issue.whatsContested?.trim() ?? "";
  const sections: OneNewsRenderSection[] = [
    section("whatHappened", labels.whatHappened, issue.whatHappened),
    section("whyItMatters", labels.whyItMatters, issue.whyItMatters),
    ...(contested ? [section("whatsContested", labels.whatsContested, contested)] : []),
    section("whatToWatch", labels.whatToWatch, issue.whatToWatch),
  ].filter((entry): entry is OneNewsRenderSection => entry !== null);

  const wordCount = countWords(sections.map((entry) => entry.text).join(" "));

  // Unsafe links are rejected here rather than escaped into the output. A link
  // the renderer cannot vouch for must not reach a reader's inbox at all.
  const orderedSources = [...sources].sort((a, b) => a.sortOrder - b.sortOrder);
  const renderSources = orderedSources.map((source, index) => {
    if (!isSafeHttpUrl(source.url)) throw new Error("unsafe_source_url");
    return {
      position: index + 1,
      url: source.url.trim(),
      title: source.title.trim(),
      publication: source.publication.trim(),
      sourceType: source.sourceType,
      typeLabel: labels.sourceType(source.sourceType),
      isPrimary: source.sourceType === "PRIMARY",
      dateLabel: source.publishedAt ? formatDate(source.publishedAt, locale, timeZone) : null,
      note: source.note?.trim() || null,
    } satisfies OneNewsRenderSource;
  });

  return {
    language: issue.readingLanguage,
    htmlLang: htmlLangFor(issue.readingLanguage),
    locale,
    subject: issue.subject.trim(),
    previewText: issue.previewText?.trim() || null,
    headline: issue.headline.trim(),
    dek: issue.dek.trim(),
    dateLabel: formatDate(date, locale, timeZone),
    readingLabel: labels.readingTime(Math.max(1, Math.ceil(wordCount / ONE_NEWS_WORDS_PER_MINUTE))),
    wordCount,
    sections,
    developing: issue.developing,
    asOfLabel: issue.asOf ? formatDateTime(issue.asOf, locale, timeZone) : null,
    asOfIso: issue.asOf ? issue.asOf.toISOString() : null,
    developingNotice: issue.developing ? labels.developingNotice : null,
    sources: renderSources,
    corrections: [...corrections]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((correction) => ({
        type: correction.type,
        label: correction.type === "MATERIAL" ? labels.correctionMaterial : labels.correctionMinor,
        note: correction.note.trim(),
        dateLabel: formatDateTime(correction.createdAt, locale, timeZone),
        isMaterial: correction.type === "MATERIAL",
      })),
    closing: labels.closing,
    labels,
  };
}

function section(
  key: OneNewsSectionKey,
  label: string,
  value: string,
): OneNewsRenderSection {
  return {
    key,
    label,
    html: editorialTextToHtml(value),
    text: editorialTextToPlainText(value),
  };
}

function formatDate(date: Date, locale: string, timeZone: string): string {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  });
}

/** Exact date and time, with the zone spelled out so it cannot be misread. */
function formatDateTime(date: Date, locale: string, timeZone: string): string {
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  });
}

export interface OneNewsLabels {
  product: string;
  whatHappened: string;
  whyItMatters: string;
  whatsContested: string;
  whatToWatch: string;
  sources: string;
  asOf: string;
  developingNotice: string;
  corrections: string;
  correctionMinor: string;
  correctionMaterial: string;
  closing: string;
  footer: string;
  readingTime: (minutes: number) => string;
  sourceType: (type: string) => string;
}

const SOURCE_TYPE_LABELS: Record<string, Record<string, string>> = {
  English: {
    PRIMARY: "Primary",
    REPORTING: "Reporting",
    ANALYSIS: "Analysis",
    RESEARCH: "Research",
    DATA: "Data",
    OTHER: "Source",
  },
  Turkish: {
    PRIMARY: "Birincil",
    REPORTING: "Haber",
    ANALYSIS: "Analiz",
    RESEARCH: "Araştırma",
    DATA: "Veri",
    OTHER: "Kaynak",
  },
  Spanish: {
    PRIMARY: "Primaria",
    REPORTING: "Reportaje",
    ANALYSIS: "Análisis",
    RESEARCH: "Investigación",
    DATA: "Datos",
    OTHER: "Fuente",
  },
  French: {
    PRIMARY: "Primaire",
    REPORTING: "Reportage",
    ANALYSIS: "Analyse",
    RESEARCH: "Recherche",
    DATA: "Données",
    OTHER: "Source",
  },
  German: {
    PRIMARY: "Primär",
    REPORTING: "Bericht",
    ANALYSIS: "Analyse",
    RESEARCH: "Forschung",
    DATA: "Daten",
    OTHER: "Quelle",
  },
};

/**
 * Section labels and the canonical closing, per supported reading language.
 * Copy is written by a human per language — nothing here is machine-translated
 * at send time.
 */
export function oneNewsLabels(language: string): OneNewsLabels {
  const typeLabel = (type: string): string =>
    SOURCE_TYPE_LABELS[language]?.[type] ?? SOURCE_TYPE_LABELS.English[type] ?? type;

  switch (language) {
    case "Turkish":
      return {
        product: "OneNews",
        whatHappened: "NE OLDU",
        whyItMatters: "NEDEN ÖNEMLİ",
        whatsContested: "NELER TARTIŞMALI",
        whatToWatch: "NEYE BAKMALI",
        sources: "KAYNAKLAR VE NOTLAR",
        asOf: "Bilgiler şu ana kadar geçerli",
        developingNotice:
          "Bu haber gelişiyor. Aşağıdaki bilgiler yalnızca belirtilen ana kadar doğrulanmıştır.",
        corrections: "DÜZELTMELER",
        correctionMinor: "Küçük düzeltme",
        correctionMaterial: "Esaslı düzeltme",
        closing: "Bugünlük bu kadar haber yeter.",
        footer: "Daha sakin bir gelen kutusu için tek bir haber.",
        readingTime: (minutes) => `${minutes} dk okuma`,
        sourceType: typeLabel,
      };
    case "Spanish":
      return {
        product: "OneNews",
        whatHappened: "QUÉ PASÓ",
        whyItMatters: "POR QUÉ IMPORTA",
        whatsContested: "QUÉ SE DISCUTE",
        whatToWatch: "QUÉ VIGILAR",
        sources: "FUENTES Y NOTAS",
        asOf: "Información verificada hasta",
        developingNotice:
          "Esta historia sigue en desarrollo. Lo siguiente está verificado solo hasta la hora indicada.",
        corrections: "CORRECCIONES",
        correctionMinor: "Corrección menor",
        correctionMaterial: "Corrección sustancial",
        closing: "Suficientes noticias por hoy.",
        footer: "Una sola noticia, para una bandeja de entrada más tranquila.",
        readingTime: (minutes) => `${minutes} min de lectura`,
        sourceType: typeLabel,
      };
    case "French":
      return {
        product: "OneNews",
        whatHappened: "CE QUI S’EST PASSÉ",
        whyItMatters: "POURQUOI C’EST IMPORTANT",
        whatsContested: "CE QUI EST CONTESTÉ",
        whatToWatch: "CE QU’IL FAUT SURVEILLER",
        sources: "SOURCES ET NOTES",
        asOf: "Informations vérifiées jusqu’au",
        developingNotice:
          "Cette histoire est en cours. Ce qui suit n’est vérifié que jusqu’à l'heure indiquée.",
        corrections: "CORRECTIONS",
        correctionMinor: "Correction mineure",
        correctionMaterial: "Correction substantielle",
        closing: "Assez d’actualité pour aujourd’hui.",
        footer: "Une seule actualité, pour une boîte de réception plus calme.",
        readingTime: (minutes) => `${minutes} min de lecture`,
        sourceType: typeLabel,
      };
    case "German":
      return {
        product: "OneNews",
        whatHappened: "WAS GESCHAH",
        whyItMatters: "WARUM ES ZÄHLT",
        whatsContested: "WAS UMSTRITTEN IST",
        whatToWatch: "WORAUF ZU ACHTEN IST",
        sources: "QUELLEN UND NOTIZEN",
        asOf: "Informationsstand",
        developingNotice:
          "Diese Geschichte entwickelt sich noch. Das Folgende ist nur bis zum angegebenen Zeitpunkt bestätigt.",
        corrections: "KORREKTUREN",
        correctionMinor: "Kleine Korrektur",
        correctionMaterial: "Wesentliche Korrektur",
        closing: "Genug Nachrichten für heute.",
        footer: "Eine Nachricht, für einen ruhigeren Posteingang.",
        readingTime: (minutes) => `${minutes} Min. Lesezeit`,
        sourceType: typeLabel,
      };
    default:
      return {
        product: "OneNews",
        whatHappened: "WHAT HAPPENED",
        whyItMatters: "WHY IT MATTERS",
        whatsContested: "WHAT’S CONTESTED",
        whatToWatch: "WHAT TO WATCH",
        sources: "SOURCES & NOTES",
        asOf: "Verified as of",
        developingNotice:
          "This story is still developing. What follows is confirmed only up to the time noted.",
        corrections: "CORRECTIONS",
        correctionMinor: "Minor correction",
        correctionMaterial: "Material correction",
        closing: "That’s enough news for today.",
        footer: "One story, for a quieter inbox.",
        readingTime: (minutes) => `${minutes} min read`,
        sourceType: typeLabel,
      };
  }
}
