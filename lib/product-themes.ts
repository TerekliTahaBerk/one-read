export const productThemes = {
  /**
   * The parent brand, and the theme the OneRead bundle is dressed in. It is
   * deliberately not a third colour: OneRead is the two products together, so
   * its accent is ink and its surfaces are the neutral greys the rest of the
   * public site already uses. `background` is the canonical page colour every
   * public surface paints itself with.
   */
  read: {
    name: "OneRead",
    background: "#FFFFFF",
    accent: "#111111",
    border: "#EAEAEA",
    /** Quiet hover/hairline fill. Faint enough to stay white-adjacent. */
    surface: "#F7F7F8",
    /** The fill a chosen control carries, one step stronger than `surface`. */
    selectedSurface: "#EDEDEE",
    mutedText: "#6B6B6B",
  },
  article: {
    name: "OneArticle",
    background: "#F3F8FF",
    accent: "#3F6FA8",
    border: "#D8E7F8",
    surface: "#EAF3FF",
    selectedSurface: "#DDEEFF",
    mutedText: "#6B6B6B",
  },
  /**
   * OneNews sits in the same system as OneArticle but reads as a sibling, not
   * a copy: a calm, slightly warm green rather than OneArticle's cool blue.
   * Deliberately not a news-alert red — nothing here should suggest a siren.
   * The accent carries white CTA text at roughly 6.9:1, comfortably past AA.
   */
  news: {
    name: "OneNews",
    background: "#F5F7F4",
    accent: "#3E6152",
    border: "#DCE5DE",
    surface: "#EDF2EC",
    selectedSurface: "#E0EAE1",
    mutedText: "#6B6B6B",
  },
} as const;

export type ProductThemeKey = keyof typeof productThemes;
