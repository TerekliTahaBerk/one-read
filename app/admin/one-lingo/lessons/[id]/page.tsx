import { notFound } from "next/navigation";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneLingoTabs } from "@/lib/admin/nav";
import { getLingoLesson } from "@/lib/admin/lingo-queries";
import { renderLingoEmail } from "@/lib/lingo/email-template";
import { LingoLessonActionsBar } from "@/components/admin/LingoLessonActionsBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneLingoLessonDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage(`/admin/one-lingo/lessons/${params.id}`, searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const lesson = await getLingoLesson(params.id);
  if (!lesson) notFound();

  const meta = (lesson.generationMetadata ?? {}) as Record<string, unknown>;
  const promptVersion = typeof meta.promptVersion === "string" ? meta.promptVersion : "n/a";
  const validationStatus = typeof meta.validationStatus === "string" ? meta.validationStatus : "n/a";
  const inputHash = typeof meta.inputHash === "string" ? meta.inputHash : "n/a";
  const genSource = typeof meta.source === "string" ? meta.source : "n/a";
  const genError = typeof meta.error === "string" ? meta.error : null;
  const genWarnings = Array.isArray(meta.warnings)
    ? (meta.warnings as unknown[]).filter((w): w is string => typeof w === "string")
    : [];

  const rendered = renderLingoEmail(lesson, {
    date: lesson.lessonDate.toISOString().slice(0, 10),
    targetLanguage: lesson.targetLanguage,
    nativeLanguage: lesson.nativeLanguage,
    level: lesson.level,
    links: { unsubscribe: "https://oneread.app/unsubscribe?preview=1" },
  });

  return (
    <AdminShell title={lesson.title} subtitle={lesson.segmentKey}>
      <AdminTabs tabs={oneLingoTabs()} active="lessons" />
      <AdminCard title="Actions" bodyClassName="p-4">
        <LingoLessonActionsBar
          lessonId={lesson.id}
          dateIso={lesson.lessonDate.toISOString().slice(0, 10)}
          segmentKey={lesson.segmentKey}
          defaultTestEmail={process.env.ADMIN_EMAIL ?? ""}
        />
      </AdminCard>
      <AdminCard title="Metadata">
        <DefList
          rows={[
            ["Date", lesson.lessonDate.toISOString().slice(0, 10)],
            ["Status", lesson.status],
            ["Approval", lesson.approvalStatus],
            ["Subject", lesson.subject],
            ["Provider", lesson.generationProvider ?? "n/a"],
            ["Model", lesson.generationModel ?? "n/a"],
            ["Prompt version", promptVersion],
            ["Generation source", genSource],
            ["Validation", validationStatus],
            ["Input hash", inputHash],
            ["Sends", lesson.sends.length],
          ]}
        />
      </AdminCard>
      {(genError || genWarnings.length > 0) && (
        <AdminCard title="Generation warnings" bodyClassName="p-4">
          {genError && (
            <div className="mb-2 text-[12.5px] text-rose-700">Error: {genError}</div>
          )}
          {genWarnings.length > 0 && (
            <ul className="list-disc pl-5 text-[12px] text-amber-700">
              {genWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </AdminCard>
      )}
      <AdminCard title="Text preview" bodyClassName="p-4">
        <pre className="whitespace-pre-wrap text-[12.5px] leading-6 text-admin-ink">{rendered.text}</pre>
      </AdminCard>
      <AdminCard title="Structured JSON" bodyClassName="p-4">
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap text-[12px] leading-5 text-admin-ink">
          {JSON.stringify(lesson.contentJson, null, 2)}
        </pre>
      </AdminCard>
    </AdminShell>
  );
}
