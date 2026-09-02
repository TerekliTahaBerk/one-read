import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { OneNewsIssueEditor } from "@/components/admin/OneNewsIssueEditor";
import { oneNewsTabs } from "@/lib/admin/one-news-nav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewOneNewsIssuePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/one-news/new", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  return (
    <AdminShell
      title="New OneNews edition"
      subtitle="One story worth understanding. Nothing here is sent — OneNews has no delivery path yet."
    >
      <AdminTabs tabs={oneNewsTabs()} active="new" />
      <AdminCard
        title="Editorial content"
        bodyClassName="p-4"
        containerClassName="overflow-visible"
      >
        <OneNewsIssueEditor />
      </AdminCard>
    </AdminShell>
  );
}
