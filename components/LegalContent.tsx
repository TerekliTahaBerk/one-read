"use client";

import { Fragment } from "react";
import { LegalLayout } from "@/components/LegalLayout";
import { renderInline } from "@/components/LegalMarkup";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { LEGAL_DICTIONARIES } from "@/lib/legal-i18n";

export function LegalContent({ doc }: { doc: "terms" | "privacy" }) {
  const { locale, dictionary } = useSiteLanguage();
  const legal = LEGAL_DICTIONARIES[locale][doc];

  return (
    <LegalLayout
      title={legal.title}
      lastUpdated={legal.lastUpdated}
      backLabel={dictionary.common.backToOneRead}
      ariaLabel={dictionary.common.oneReadHome}
    >
      {legal.intro.map((paragraph, index) => (
        <p key={`intro-${index}`}>{renderInline(paragraph)}</p>
      ))}

      {legal.sections.map((section) => (
        <Fragment key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p key={index}>{renderInline(paragraph)}</p>
          ))}
          {section.list && (
            <ul>
              {section.list.map((item, index) => (
                <li key={index}>{renderInline(item)}</li>
              ))}
            </ul>
          )}
        </Fragment>
      ))}
    </LegalLayout>
  );
}
