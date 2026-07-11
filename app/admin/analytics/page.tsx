import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";
export default async function AnalyticsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const guard = guardAdminPage("/admin/analytics", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const [feedback, sent, failed, recent] = await Promise.all([
    prisma.feedback.groupBy({ by: ["reaction"], _count: { _all: true } }),
    prisma.dailySend.count({ where: { status: "SENT" } }),
    prisma.dailySend.count({ where: { status: "FAILED" } }),
    prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { subscriber: { select: { email: true } } } }),
  ]);
  const counts = Object.fromEntries(feedback.map((r) => [r.reaction, r._count._all]));
  return <AdminShell title="Analytics" subtitle="Delivery outcomes and reader reactions">
    <AdminCard title="Outcomes" bodyClassName="p-4"><MetricGrid>
      <MetricCard label="Delivered" value={sent} tone="good" /><MetricCard label="Failed" value={failed} tone={failed ? "warn" : "default"} />
      {(["loved", "liked", "meh", "disliked"] as const).map((r) => <MetricCard key={r} label={r} value={counts[r] ?? 0} />)}
    </MetricGrid></AdminCard>
    <AdminCard title="Recent feedback" subtitle="Latest 50 reactions"><AdminTable head={["Time", "Reader", "Reaction", "Topic", "Source"]}
      empty="No reader feedback yet." rows={recent.map((r) => [fmtDateTime(r.createdAt), r.subscriber.email, r.reaction, r.topic ?? "—", r.sourceName ?? "—"])} />
    </AdminCard>
  </AdminShell>;
}
