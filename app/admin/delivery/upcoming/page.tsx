import Link from "next/link";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { countEligibleRecipients } from "@/lib/one-article/editorial";
import { validateEditorialIssue } from "@/lib/one-article/editorial-validation";
import { eligibleOneNewsRecipients } from "@/lib/one-news/delivery";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * /admin/delivery/upcoming — what is queued to go out, and whether anything
 * would block it. Readiness reuses the same conditions the dispatch path
 * applies, so this screen cannot disagree with what actually happens at send
 * time: the OneArticle validator for OneArticle, and the literal
 * SCHEDULED + readyAt + lead-candidate rule for OneNews.
 */
export default async function DeliveryUpcomingPage() {
  const guard = await guardAdminPage("/admin/delivery/upcoming");
  if (!guard.ok) return <AdminNotConfigured />;

  const [issues, newsIssues] = await Promise.all([
    prisma.oneArticleIssue.findMany({
      where: { status: { in: ["DRAFT", "READY", "SCHEDULED"] } },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.oneNewsIssue.findMany({
      where: { status: { in: ["DRAFT", "READY", "SCHEDULED"] } },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
  ]);

  // Estimates are resolved once per distinct language rather than per edition.
  const languages = [...new Set(issues.map((issue) => issue.readingLanguage))];
  const estimates = new Map(
    await Promise.all(
      languages.map(
        async (language) =>
          [language, await countEligibleRecipients(language)] as const,
      ),
    ),
  );
  const newsLanguages = [...new Set(newsIssues.map((issue) => issue.readingLanguage))];
  const newsEstimates = new Map(
    await Promise.all(
      newsLanguages.map(
        async (language) =>
          [language, (await eligibleOneNewsRecipients(language)).length] as const,
      ),
    ),
  );

  return (
    <AdminShell
      title="Upcoming delivery"
      subtitle="Scheduled editions, editorial readiness, and blocking validation"
    >
      <AdminCard title="OneArticle">
        <AdminTable
          head={["Edition", "Language", "Scheduled", "State", "Recipients", "Readiness"]}
          empty="No upcoming editions."
          rows={issues.map((issue) => {
            const check = validateEditorialIssue(issue);
            return [
              <Link
                key="issue"
                href={`/admin/one-article/issues/${issue.id}`}
                className="text-admin-ink underline underline-offset-2"
              >
                {issue.headline}
              </Link>,
              issue.readingLanguage,
              fmtDateTime(issue.scheduledFor),
              <StatusBadge key="state" value={issue.status} />,
              estimates.get(issue.readingLanguage) ?? 0,
              check.ok ? (
                "Ready to send"
              ) : (
                <span key="blocked" className="text-dawn">
                  {check.error}
                </span>
              ),
            ];
          })}
        />
      </AdminCard>

      <AdminCard title="OneNews">
        <AdminTable
          head={["Brief", "Language", "Scheduled", "State", "Recipients", "Readiness"]}
          empty="No upcoming briefs."
          rows={newsIssues.map((issue) => [
            <Link
              key="issue"
              href={`/admin/one-news/issues/${issue.id}`}
              className="text-admin-ink underline underline-offset-2"
            >
              {issue.headline}
            </Link>,
            issue.readingLanguage,
            fmtDateTime(issue.scheduledFor),
            <StatusBadge key="state" value={issue.status} />,
            newsEstimates.get(issue.readingLanguage) ?? 0,
            <span key="readiness" className={oneNewsBlocker(issue) ? "text-dawn" : undefined}>
              {oneNewsBlocker(issue) ?? "Ready to send"}
            </span>,
          ])}
        />
      </AdminCard>

      <p className="font-sans text-[12px] leading-5 text-admin-muted">
        Recipient estimates use the same eligibility resolver as dispatch, so
        they reflect live billing, preference, and suppression state.
      </p>
    </AdminShell>
  );
}

/**
 * The exact conditions `dispatchDueOneNewsIssues` selects on, stated as the one
 * that is missing. Stated positively elsewhere it would drift; here it is the
 * same list, in the same order.
 */
function oneNewsBlocker(issue: {
  status: string;
  scheduledFor: Date | null;
  readyAt: Date | null;
  slotId: string | null;
  editorialRank: number;
}): string | null {
  if (!issue.readyAt) return "Not marked ready by an editor";
  if (issue.status !== "SCHEDULED") return "Not scheduled for delivery";
  if (!issue.scheduledFor) return "No delivery time set";
  if (issue.slotId && issue.editorialRank !== 0) return "Not the lead candidate in its slot";
  return null;
}
