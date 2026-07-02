import Link from "next/link";
import { notFound } from "next/navigation";
import { guardAdminPage } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList } from "@/components/admin/AdminCard";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge, EligibilityBadge } from "@/components/admin/StatusBadge";
import { evaluateEligibility } from "@/lib/subscriptions";
import { topicBySlug } from "@/lib/topics";
import { fmtDate, fmtDateTime, yesNo } from "@/lib/admin/format";
import { UserActionsBar } from "@/components/admin/UserActionsBar";
import { PreferencesEditor } from "@/components/admin/PreferencesEditor";
import { INTERESTS, SOURCE_LANGUAGES, SUMMARY_LANGUAGES } from "@/lib/options";
import { loadAuditLogs, summarizeAuditMetadata } from "@/lib/admin/audit";
import { ONE_FILM_PRODUCT_KEY, ONE_NEWS_PRODUCT_KEY, ONE_READ_PRODUCT_KEY } from "@/lib/options";
import {
  resolveOneArticleEligibilityForContact,
  resolveOneFilmEligibilityForContact,
  resolveOneNewsEligibilityForContact,
} from "@/lib/oneread/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/users/[id] — full detail for one OneArticle subscription. */
export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage(`/admin/users/${params.id}`, searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const sub = await prisma.productSubscription.findUnique({
    where: { id: params.id },
    include: { preferences: true, contact: true },
  });
  if (!sub) notFound();

  const elig = evaluateEligibility(sub);
  const prefs = sub.preferences;

  // Activity: sends + feedback for this person (by new-model link or by email
  // through the legacy Subscriber, since the backfill is still in progress).
  // Verification status — timestamps/counts only, never codes or hashes.
  const [lastVerificationRequest, lastVerified] = await Promise.all([
    prisma.emailVerificationCode.findFirst({
      where: { email: sub.contact.email },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.emailVerificationCode.findFirst({
      where: { email: sub.contact.email, consumedAt: { not: null } },
      orderBy: { consumedAt: "desc" },
      select: { consumedAt: true },
    }),
  ]);

  const [oneReadSub, filmHolder, newsHolder, oneReadElig, oneFilmElig, oneNewsElig] = await Promise.all([
    prisma.productSubscription.findUnique({
      where: { contactId_productKey: { contactId: sub.contactId, productKey: ONE_READ_PRODUCT_KEY } },
    }),
    prisma.productSubscription.findUnique({
      where: { contactId_productKey: { contactId: sub.contactId, productKey: ONE_FILM_PRODUCT_KEY } },
      include: { filmPreferences: true },
    }),
    prisma.productSubscription.findUnique({
      where: { contactId_productKey: { contactId: sub.contactId, productKey: ONE_NEWS_PRODUCT_KEY } },
      include: { newsPreferences: true },
    }),
    resolveOneArticleEligibilityForContact(sub.contactId),
    resolveOneFilmEligibilityForContact(sub.contactId),
    resolveOneNewsEligibilityForContact(sub.contactId),
  ]);

  const [sends, feedback, auditEvents] = await Promise.all([
    prisma.dailySend.findMany({
      where: {
        OR: [
          { productSubscriptionId: sub.id },
          { subscriber: { email: sub.contact.email } },
        ],
      },
      include: { pick: true },
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.feedback.findMany({
      where: {
        OR: [
          { productSubscriptionId: sub.id },
          { subscriber: { email: sub.contact.email } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    loadAuditLogs({ targetType: "ProductSubscription", q: sub.id }, 20),
  ]);

  const lastSend = sends.find((s) => s.status === "SENT");

  return (
    <AdminShell
      title={sub.contact.email}
      subtitle="OneArticle subscription detail"
      actions={
        <Link href="/admin/users" className="text-[13px] text-ash hover:text-ink">
          ← All users
        </Link>
      }
    >
      <AdminCard title="Actions" bodyClassName="p-4">
        <UserActionsBar
          subId={sub.id}
          email={sub.contact.email}
          emailDeliveryStatus={sub.emailDeliveryStatus}
          adminOverride={sub.adminOverride}
        />
      </AdminCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
        <AdminCard title="Contact">
          <DefList
            rows={[
              ["Email", sub.contact.email],
              ["Contact ID", <MonoShort key="c" value={sub.contact.id} />],
              ["Created", fmtDateTime(sub.contact.createdAt)],
              ["Updated", fmtDateTime(sub.contact.updatedAt)],
              ["Email delivery", <StatusBadge key="e" value={sub.emailDeliveryStatus} />],
              ["Email verified", lastVerified?.consumedAt ? fmtDateTime(lastVerified.consumedAt) : "Not verified"],
              ["Last verification request", fmtDateTime(lastVerificationRequest?.createdAt ?? null)],
              ["Unsubscribe token", <MonoShort key="u" value={sub.unsubscribeToken} />],
            ]}
          />
        </AdminCard>

        <AdminCard title="Eligibility">
          <div className="px-4 py-4">
            <EligibilityBadge allowed={elig.allowed} reason={elig.reason} />
            <p className="mt-3 text-[12.5px] text-ash font-sans">
              {elig.allowed
                ? "This subscriber will receive the daily OneArticle email when an issue matches their segment."
                : "This subscriber is not receiving emails. The reason above is the canonical verdict from canReceiveOneArticleEmail."}
            </p>
          </div>
        </AdminCard>
      </div>

      <AdminCard title="OneRead umbrella">
        <DefList
          rows={[
            [
              "OneRead subscription status",
              oneReadSub ? <StatusBadge key="s" value={oneReadSub.status} /> : "No OneRead subscription",
            ],
            ["Included products", oneReadSub ? "OneArticle, OneNews, OneFilm" : "—"],
            [
              "OneArticle eligibility",
              <EligibilityBadge key="a" allowed={oneReadElig.allowed} reason={oneReadElig.reason} />,
            ],
            [
              "OneNews subscription status",
              newsHolder ? <StatusBadge key="ns" value={newsHolder.status} /> : "No OneNews record",
            ],
            [
              "OneNews eligibility",
              <EligibilityBadge key="n" allowed={oneNewsElig.allowed} reason={oneNewsElig.reason} />,
            ],
            ["OneNews preferences complete", yesNo(Boolean(newsHolder?.newsPreferences))],
            [
              "OneFilm subscription status",
              filmHolder ? <StatusBadge key="fs" value={filmHolder.status} /> : "No OneFilm record",
            ],
            [
              "OneFilm eligibility",
              <EligibilityBadge key="f" allowed={oneFilmElig.allowed} reason={oneFilmElig.reason} />,
            ],
            ["OneFilm preferences complete", yesNo(Boolean(filmHolder?.filmPreferences))],
          ]}
        />
      </AdminCard>

      <AdminCard title="Subscription">
        <DefList
          rows={[
            ["Access status", <StatusBadge key="s" value={sub.status} />],
            ["Admin override", yesNo(sub.adminOverride)],
            ["Admin note", sub.adminNote ?? "—"],
            ["Payment provider", sub.paymentProvider ?? "—"],
            ["Plan", sub.plan ?? "—"],
            ["Provider customer ID", <MonoShort key="c" value={sub.providerCustomerId} />],
            ["Provider subscription ID", <MonoShort key="s2" value={sub.providerSubscriptionId} />],
            ["Checkout session ID", <MonoShort key="ch" value={sub.providerCheckoutSessionId} />],
            ["Paid at", fmtDateTime(sub.paidAt)],
            ["Trial started", fmtDateTime(sub.trialStartedAt)],
            ["Trial ends", fmtDateTime(sub.trialEndsAt)],
            ["Trial used at", fmtDateTime(sub.trialUsedAt)],
            ["Current period start", fmtDateTime(sub.currentPeriodStart)],
            ["Current period end", fmtDateTime(sub.currentPeriodEnd)],
            ["Cancel at period end", yesNo(sub.cancelAtPeriodEnd)],
            ["Canceled at", fmtDateTime(sub.canceledAt)],
            ["Past due at", fmtDateTime(sub.pastDueAt)],
            ["Last sent", fmtDateTime(sub.lastSentAt)],
          ]}
        />
      </AdminCard>

      <AdminCard title="OneArticle preferences">
        <div className="p-4 border-b border-line">
          <PreferencesEditor
            subId={sub.id}
            interests={INTERESTS}
            sourceLanguages={SOURCE_LANGUAGES}
            summaryLanguages={SUMMARY_LANGUAGES}
            current={{
              interests: prefs?.interests ?? [],
              sourceLanguage: prefs?.sourceLanguage ?? null,
              summaryLanguage: prefs?.summaryLanguage ?? null,
            }}
          />
        </div>
        {prefs ? (
          <DefList
            rows={[
              ["Source language", prefs.sourceLanguage ?? "—"],
              ["Summary language", prefs.summaryLanguage ?? "—"],
              ["Primary interest", prefs.primaryInterest ?? "—"],
              [
                "Secondary interests",
                prefs.secondaryInterests.length ? prefs.secondaryInterests.join(", ") : "—",
              ],
              ["Interests", prefs.interests.length ? prefs.interests.join(", ") : "—"],
              ["Difficulty", prefs.preferredDifficulty],
              ["Timezone", prefs.timezone ?? "—"],
              ["Created", fmtDateTime(prefs.createdAt)],
              ["Updated", fmtDateTime(prefs.updatedAt)],
            ]}
          />
        ) : (
          <div className="px-4 py-6 text-[13px] text-fog">
            Preferences saved, checkout not completed — or preferences not yet set.
          </div>
        )}
      </AdminCard>

      <AdminCard
        title="Activity — recent sends"
        subtitle={lastSend ? `last sent ${fmtDate(lastSend.date)}` : "no sends yet"}
      >
        <AdminTable
          head={["Date", "Status", "Topic", "Language", "Score", "Sent at", "Note"]}
          empty="No sends recorded for this subscriber yet."
          rows={sends.map((s) => [
            <span key="d" className="text-ash">{fmtDate(s.date)}</span>,
            <StatusBadge key="s" value={s.status} />,
            topicBySlug(s.matchedTopic)?.label ?? s.matchedTopic,
            <span key="l" className="text-ash">{s.summaryLanguage}</span>,
            s.personalizedScore.toFixed(2),
            <span key="sa" className="text-ash">{fmtDateTime(s.sentAt)}</span>,
            <span key="n" className="text-[11.5px] text-dawn">{s.error ?? "—"}</span>,
          ])}
        />
      </AdminCard>

      <AdminCard title="Activity — feedback" subtitle={`${feedback.length} reactions`}>
        <AdminTable
          head={["Date", "Reaction", "Topic", "Source"]}
          empty="No feedback recorded yet."
          rows={feedback.map((fb) => [
            <span key="d" className="text-ash">{fmtDate(fb.createdAt)}</span>,
            fb.reaction,
            fb.topic ? topicBySlug(fb.topic)?.label ?? fb.topic : "—",
            fb.sourceName ?? "—",
          ])}
        />
      </AdminCard>

      <AdminCard title="Audit history" subtitle="From AdminAuditLog">
        <AdminTable
          head={["Date", "Action", "Actor", "Metadata"]}
          empty="No audit events for this user yet."
          rows={auditEvents.map((event) => [
            <span key="d" className="text-ash">{fmtDateTime(event.createdAt)}</span>,
            <StatusBadge key="a" value={event.action} tone="neutral" />,
            <span key="actor" className="font-mono text-[11.5px] text-ash">{event.actor}</span>,
            <span key="m" className="text-[11.5px] text-ash">
              {summarizeAuditMetadata(event.metadata)}
            </span>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
