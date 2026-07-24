import type { Metadata } from "next";
import { OneReadSignup } from "@/components/OneReadSignup";

export const metadata: Metadata = {
  title: "Start OneRead",
  description:
    "Choose your reading language and start OneArticle with OneRead.",
};

export default function SubscribePage() {
  return <OneReadSignup />;
}
