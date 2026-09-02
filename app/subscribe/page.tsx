import type { Metadata } from "next";
import { OneReadSignup } from "@/components/OneReadSignup";

export const metadata: Metadata = {
  title: "Start OneRead",
  description:
    "Choose your OneArticle reading preferences and continue to secure checkout.",
  robots: { index: false, follow: false },
};

export default async function SubscribePage(
  props: {
    searchParams: Promise<{ email?: string; offer?: string; interval?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return <OneReadSignup initialEmail={searchParams.email ?? ""} initialOffer={searchParams.offer} initialInterval={searchParams.interval} />;
}
