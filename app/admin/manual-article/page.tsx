import { redirect } from "next/navigation";
export default function LegacyManualArticlePage() {
  redirect("/admin/one-article/new");
}
