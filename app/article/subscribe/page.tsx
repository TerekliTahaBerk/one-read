import type { Metadata } from "next";
import { ArticleSubscribePageContent } from "@/components/ArticleSubscribePageContent";
import { isMockAllowed } from "@/lib/billing/mock";
import { isBillingConfigured } from "@/lib/billing/provider";

export const metadata: Metadata = {
  title: "Subscribe — OneArticle",
  description:
    "Enter your email to continue your OneArticle subscription, manage billing, or restart your daily emails.",
};

export default function ArticleSubscribePage() {
  // Billing CTAs are live when a provider is usable: mock in dev (or an
  // explicit prod preview), or any configured provider. Otherwise CTAs degrade
  // to a pricing-page link.
  const billingEnabled = isMockAllowed() || isBillingConfigured();

  return <ArticleSubscribePageContent billingEnabled={billingEnabled} />;
}
