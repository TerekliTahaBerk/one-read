import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, AdminEmptyState } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneLingoTabs } from "@/lib/admin/nav";
import { getLingoLessons } from "@/lib/admin/lingo-queries";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneLingoLessonsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-lingo/lessons", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const lessons = await getLingoLessons();

  return (
    <AdminShell title="OneLingo lessons" subtitle="Every lesson prepared so far">
      <AdminTabs tabs={oneLingoTabs()} active="lessons" />
      <AdminCard>
        {lessons.length === 0 ? (
          <AdminEmptyState>No OneLingo lessons generated yet.</AdminEmptyState>
        ) : (
          <table className="w-full text-left text-[12.5px] font-sans">
            <thead className="border-b border-admin-line text-admin-muted">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Segment</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Approval</th>
                <th className="px-4 py-2">Sends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line/70">
              {lessons.map((lesson) => (
                <tr key={lesson.id}>
                  <td className="px-4 py-2 text-admin-body">{lesson.lessonDate.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 text-admin-ink">
                    <Link className="link-underline" href={`/admin/one-lingo/lessons/${lesson.id}`}>
                      {lesson.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-admin-body">{lesson.segmentKey}</td>
                  <td className="px-4 py-2"><StatusBadge value={lesson.status} /></td>
                  <td className="px-4 py-2"><StatusBadge value={lesson.approvalStatus} /></td>
                  <td className="px-4 py-2 text-admin-body">{lesson._count.sends}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </AdminShell>
  );
}
