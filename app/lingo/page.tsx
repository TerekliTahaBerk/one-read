import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "OneLingo - Small language practice. Every morning.",
  description:
    "Choose your target language, native language, level, and goals. OneLingo sends one calm language-practice email every morning.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LingoPage() {
  notFound();
}
