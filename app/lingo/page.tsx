import type { Metadata } from "next";
import { LingoLanding } from "@/components/LingoLanding";

export const metadata: Metadata = {
  title: "OneLingo - Small language practice. Every morning.",
  description:
    "Choose your target language, native language, level, and goals. OneLingo sends one calm language-practice email every morning.",
};

export default function LingoPage() {
  return <LingoLanding />;
}
