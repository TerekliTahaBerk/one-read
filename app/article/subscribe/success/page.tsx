import type { Metadata } from "next";
import { ArticleSubscribeSuccessContent } from "@/components/ArticleSubscribeSuccessContent";

export const metadata: Metadata = {
  title: "Checkout complete — OneArticle",
  description: "Your OneArticle checkout is complete and activation is syncing.",
};

export default function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: { checkout_id?: string; email?: string };
}) {
  return <ArticleSubscribeSuccessContent searchParams={searchParams} />;
}
