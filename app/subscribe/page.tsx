import type { Metadata } from "next";
import { OneReadSignup } from "@/components/OneReadSignup";

export const metadata: Metadata = {
  title: "Start OneRead",
  description:
    "Set up OneArticle, OneFilm, or both — one subscription covers everything.",
};

export default function SubscribePage() {
  return <OneReadSignup />;
}
