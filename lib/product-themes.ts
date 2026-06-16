export const productThemes = {
  read: {
    name: "One Read",
    background: "#FFFFFF",
    accent: "#111111",
    border: "#EAEAEA",
    surface: "#FFFFFF",
    mutedText: "#6B6B6B",
  },
  article: {
    name: "One Article",
    background: "#FBF7EF",
    accent: "#8A6F3F",
    border: "#E8DDC9",
    surface: "#F6EFE3",
    mutedText: "#6B6B6B",
  },
  lingo: {
    name: "One Lingo",
    background: "#F5F1FF",
    accent: "#6F5AA8",
    border: "#DED4F5",
    surface: "#EEE7FB",
    mutedText: "#6B6B6B",
  },
  goal: {
    name: "One Goal",
    background: "#F1FAF3",
    accent: "#3F7A4A",
    border: "#D3EBD8",
    surface: "#E7F5EA",
    mutedText: "#6B6B6B",
  },
} as const;

export type ProductThemeKey = keyof typeof productThemes;
