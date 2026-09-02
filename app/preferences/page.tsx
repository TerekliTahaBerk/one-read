import type { Metadata } from "next";
import { OneReadPreferences } from "@/components/OneReadPreferences";

export const metadata: Metadata = {
  title: "My OneRead",
  description: "Manage OneArticle and OneNews email delivery separately from billing.",
  robots: { index: false, follow: false },
};

export default async function PreferencesPage(
  props: {
    searchParams: Promise<{ email?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return <OneReadPreferences initialEmail={searchParams.email ?? ""} />;
}
