import type { Metadata } from "next";
import { OneReadSignup } from "@/components/OneReadSignup";

export const metadata: Metadata = {
  title: "Start OneRead",
  description:
    "Set up OneArticle and OneFilm — one OneRead subscription covers both.",
};

export default function SubscribePage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  return <OneReadSignup initialEmail={searchParams.email ?? ""} />;
}
