import type { Metadata } from "next";
import { OneReadPreferences } from "@/components/OneReadPreferences";

export const metadata: Metadata = {
  title: "Manage OneRead",
  description: "Check your OneRead subscription status and edit your OneArticle reading language.",
};

export default async function PreferencesPage(
  props: {
    searchParams: Promise<{ email?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return <OneReadPreferences initialEmail={searchParams.email ?? ""} />;
}
