import { StyleSheet, View } from "react-native";
import { useTheme } from "@/design/useTheme";

export function Mascot({ size = 88 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.wrap, { width: size, height: size }]}> 
      <View style={[styles.leg, { left: "34%", backgroundColor: colors.textPrimary, transform: [{ rotate: "8deg" }] }]} />
      <View style={[styles.leg, { left: "66%", backgroundColor: colors.textPrimary, transform: [{ rotate: "-16deg" }] }]} />
      <View style={[styles.body, { backgroundColor: colors.textPrimary }]} />
      <View style={[styles.bump, styles.bumpLeft, { backgroundColor: colors.textPrimary }]} />
      <View style={[styles.bump, styles.bumpTop, { backgroundColor: colors.textPrimary }]} />
      <View style={[styles.bump, styles.bumpRight, { backgroundColor: colors.textPrimary }]} />
      <View style={[styles.eye, { left: "31%", backgroundColor: colors.surfaceElevated }]}><View style={[styles.pupil, { backgroundColor: colors.textPrimary }]} /></View>
      <View style={[styles.eye, { left: "52%", backgroundColor: colors.surfaceElevated }]}><View style={[styles.pupil, { backgroundColor: colors.textPrimary }]} /></View>
      <View style={[styles.arm, { left: "12%", backgroundColor: colors.textPrimary, transform: [{ rotate: "38deg" }] }]} />
      <View style={[styles.arm, { right: "7%", backgroundColor: colors.textPrimary, transform: [{ rotate: "-42deg" }] }]} />
      <View style={[styles.paper, { backgroundColor: colors.accentSoft, borderColor: colors.textPrimary }]}>
        <View style={[styles.paperLine, { backgroundColor: colors.textPrimary }]} />
        <View style={[styles.paperLine, styles.paperLineShort, { backgroundColor: colors.textPrimary }]} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { position: "relative" },
  body: { position: "absolute", left: "18%", top: "20%", width: "67%", height: "55%", borderRadius: 999 },
  bump: { position: "absolute", borderRadius: 999 },
  bumpLeft: { left: "12%", top: "29%", width: "35%", height: "37%" },
  bumpTop: { left: "34%", top: "10%", width: "38%", height: "42%" },
  bumpRight: { right: "7%", top: "27%", width: "34%", height: "38%" },
  eye: { position: "absolute", top: "29%", width: "18%", height: "24%", borderRadius: 99, alignItems: "center", justifyContent: "flex-end", paddingBottom: "4%" },
  pupil: { width: "34%", aspectRatio: 1, borderRadius: 99 },
  arm: { position: "absolute", top: "61%", width: "28%", height: 2.5, borderRadius: 3 },
  leg: { position: "absolute", top: "71%", width: 2.5, height: "19%", borderRadius: 3 },
  paper: { position: "absolute", left: "10%", bottom: "7%", width: "43%", height: "35%", borderWidth: 2, borderRadius: 2, transform: [{ rotate: "-12deg" }], paddingTop: "14%", paddingHorizontal: "12%", gap: 4 },
  paperLine: { height: 1.5, width: "100%" },
  paperLineShort: { width: "66%" },
});
