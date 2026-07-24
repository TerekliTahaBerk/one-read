import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { EditorialIssueEditor } from "@/components/admin/EditorialIssueEditor";
import { oneArticleTabs } from "@/lib/admin/nav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewEditorialIssuePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-article/new", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  return (
    <AdminShell title="New edition" subtitle="Write, preview and prepare a language-specific OneArticle email">
      <AdminTabs tabs={oneArticleTabs()} active="new" />
      <AdminCard title="Editorial content" subtitle="Nothing is sent until this edition is explicitly scheduled" bodyClassName="p-4">
        <EditorialIssueEditor />
      </AdminCard>
    </AdminShell>
  );
}
