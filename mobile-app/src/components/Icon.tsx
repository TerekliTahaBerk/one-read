import type { ComponentProps } from "react";
import type { ColorValue, StyleProp, TextStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Icon({ name, size = 22, color, style }: { name: IconName; size?: number; color: ColorValue; style?: StyleProp<TextStyle> }) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
