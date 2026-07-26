import type { Metadata } from "next";
import { OneReadSignup } from "@/components/OneReadSignup";

export const metadata: Metadata = {
  title: "Start OneRead",
  description:
    "Set up OneArticle and OneFilm — one OneRead subscription covers both.",
};

export default async function SubscribePage(
  props: {
    searchParams: Promise<{ email?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return <OneReadSignup initialEmail={searchParams.email ?? ""} />;
}
