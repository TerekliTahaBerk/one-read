import { ManualArticleForm } from "@/components/ManualArticleForm";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only form to add a candidate article by hand. Useful for testing
 * editorial quality before real RSS/LLM providers are configured.
 */
export default function ManualArticlePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/manual-article", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  return (
    <AdminShell title="Add an article manually" subtitle="Manual editorial candidate">
      <div className="mb-6">
        <a
          href="/admin"
          className="text-[12px] text-fog hover:text-ink font-sans"
        >
          ← Back to admin
        </a>
        <p className="text-[13.5px] text-ash font-sans mt-2 max-w-2xl">
          Saved as <code>PENDING</code> and deduped by URL. Run{" "}
          <code>npm run score</code> (or the daily pipeline) to score and
          summarize it. The scorer trusts the body you paste here and skips the
          network fetch.
        </p>
      </div>
      <ManualArticleForm />
    </AdminShell>
  );
}
