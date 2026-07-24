import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Subscribe — OneArticle",
  description:
    "Enter your email to continue your OneArticle subscription, manage billing, or restart your daily emails.",
};

export default function ArticleSubscribePage() {
  redirect("/subscribe");
}
