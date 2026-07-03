import type { Metadata } from "next";
import { LingoSubscribePageContent } from "@/components/LingoSubscribePageContent";

export const metadata: Metadata = {
  title: "Subscribe - OneLingo",
  description: "Manage or start your OneLingo subscription.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LingoSubscribePage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  return <LingoSubscribePageContent initialEmail={searchParams.email ?? ""} />;
}
