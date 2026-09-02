import type { ComponentProps } from "react";
import { Text, type ColorValue } from "react-native";
import { fonts } from "@/design/tokens";
import { useTheme } from "@/design/useTheme";

type Variant = "displayHero" | "display" | "title1" | "title2" | "title3" | "bodyLarge" | "body" | "bodySmall" | "caption" | "eyebrow" | "metadata" | "quote";
const styles: Record<Variant, { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number; textTransform?: "uppercase" }> = {
  displayHero: { fontFamily: fonts.display, fontSize: 38, lineHeight: 42, letterSpacing: -1.05 },
  display: { fontFamily: fonts.display, fontSize: 31, lineHeight: 36, letterSpacing: -0.7 },
  title1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31, letterSpacing: -0.4 },
  title2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 27, letterSpacing: -0.2 },
  title3: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 24 },
  bodyLarge: { fontFamily: fonts.body, fontSize: 18, lineHeight: 29 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25 },
  bodySmall: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, letterSpacing: 1.45, textTransform: "uppercase" },
  metadata: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, letterSpacing: 0.2 },
  quote: { fontFamily: fonts.displayItalic, fontSize: 25, lineHeight: 34 },
};

export function AppText({ variant = "body", color, style, ...props }: ComponentProps<typeof Text> & { variant?: Variant; color?: ColorValue }) {
  const { colors } = useTheme();
  return <Text allowFontScaling maxFontSizeMultiplier={2.4} {...props} style={[styles[variant], { color: color ?? colors.textPrimary }, style]} />;
}
