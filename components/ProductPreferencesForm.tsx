"use client";
import { ProductMascot, productThemeKey, themeStyle } from "./ProductIdentity";
import { choicePill, fieldLabel } from "./SignupShell";
import { useSiteLanguage } from "./SiteLanguageProvider";
import { TOPIC_CATALOG, topicBySlug } from "@/lib/topics";
import { SUMMARY_LANGUAGES } from "@/lib/options";
import { MAX_PRODUCT_TOPICS } from "@/lib/product-preferences";
import { LOCALIZED_TOPIC_LABELS, READING_LANGUAGE_LABELS, type SiteLocale } from "@/lib/site-i18n";
import { PRODUCTS, type ProductKey } from "@/lib/products/registry";

export function topicLabel(slug: string, locale: SiteLocale) {
  return LOCALIZED_TOPIC_LABELS[locale]?.[slug] ?? topicBySlug(slug)?.label ?? slug;
}

/** Controlled fields only: the signup/account parent owns saving and navigation. */
export function ProductPreferencesForm({ product, selectedTopics, language, onTopicsChange, onLanguageChange, disabled = false }: {
  product: ProductKey; selectedTopics: string[]; language: string;
  onTopicsChange: (topics: string[]) => void; onLanguageChange: (language: string) => void; disabled?: boolean;
}) {
  const { dictionary, locale } = useSiteLanguage();
  const copy = dictionary.productPreferences;
  return (
    <div className="w-full min-w-0 space-y-6" style={themeStyle(productThemeKey(product))}>
      <div className="flex items-center justify-center gap-3">
        <ProductMascot product={product} size="sm" />
        <h2 className="font-serif text-2xl">{copy.setupTitle.replace("{product}", PRODUCTS[product].displayName)}</h2>
      </div>
      <fieldset disabled={disabled} aria-describedby={`${product}-topic-limits`}>
        <legend className={`${fieldLabel} mb-2`}>{copy.question}</legend>
        <p id={`${product}-topic-limits`} className="mb-3 text-sm text-ash">{copy.limits}</p>
        <div className="flex flex-wrap gap-2">
          {TOPIC_CATALOG.map((topic) => {
            const selected = selectedTopics.includes(topic.slug);
            return <button key={topic.slug} type="button" aria-pressed={selected}
              disabled={!selected && selectedTopics.length >= MAX_PRODUCT_TOPICS}
              className={`${choicePill(selected)} max-w-full whitespace-normal disabled:opacity-40`}
              onClick={() => onTopicsChange(selected ? selectedTopics.filter((slug) => slug !== topic.slug) : [...selectedTopics, topic.slug])}>
              {selected ? "✓ " : ""}{topicLabel(topic.slug, locale)}
            </button>;
          })}
        </div>
        <p className="mt-3 text-sm text-ash" aria-live="polite">{copy.count.replace("{count}", String(selectedTopics.length))}</p>
      </fieldset>
      <fieldset disabled={disabled}>
        <legend className={`${fieldLabel} mb-3`}>{copy.language}</legend>
        <div className="flex flex-wrap gap-2">{SUMMARY_LANGUAGES.map((item) => (
          <button key={item} type="button" aria-pressed={language === item} className={choicePill(language === item)} onClick={() => onLanguageChange(item)}>{READING_LANGUAGE_LABELS[item]}</button>
        ))}</div>
      </fieldset>
    </div>
  );
}
