export const productThemes = {
  read: {
    name: "OneRead",
    background: "#FFFFFF",
    accent: "#111111",
    border: "#EAEAEA",
    surface: "#FFFFFF",
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
