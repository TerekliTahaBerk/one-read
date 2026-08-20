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
} as const;

export type ProductThemeKey = keyof typeof productThemes;
