import type { Metadata } from "next";
import { OneReadPreferences } from "@/components/OneReadPreferences";

export const metadata: Metadata = {
  title: "Manage OneRead",
  description: "Check your OneRead subscription status and edit your OneArticle reading language.",
};

export default function PreferencesPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  return <OneReadPreferences initialEmail={searchParams.email ?? ""} />;
}
