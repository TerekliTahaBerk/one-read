import type { Metadata } from "next";
import { ArticleSubscribeSuccessContent } from "@/components/ArticleSubscribeSuccessContent";

export const metadata: Metadata = {
  title: "Checkout complete — OneArticle",
  description: "Your OneArticle checkout is complete and activation is syncing.",
};

export default async function SubscribeSuccessPage(
  props: {
    searchParams: Promise<{ checkout_id?: string; email?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return <ArticleSubscribeSuccessContent searchParams={searchParams} />;
}
