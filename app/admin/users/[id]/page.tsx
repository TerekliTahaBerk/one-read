import Link from "next/link";
import { notFound } from "next/navigation";
import { guardAdminPage } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList } from "@/components/admin/AdminCard";
import { Details } from "@/components/admin/Details";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge, EligibilityBadge } from "@/components/admin/StatusBadge";
import { evaluateEligibility } from "@/lib/subscriptions";
import { fmtDateTime, yesNo } from "@/lib/admin/format";
import { UserActionsBar } from "@/components/admin/UserActionsBar";
import { PreferencesEditor } from "@/components/admin/PreferencesEditor";
import { SUMMARY_LANGUAGES } from "@/lib/options";
import { loadAuditLogs, summarizeAuditMetadata } from "@/lib/admin/audit";
import { ONE_FILM_PRODUCT_KEY, ONE_READ_PRODUCT_KEY } from "@/lib/options";
import {
  resolveOneArticleEligibilityForContact,
  resolveOneFilmEligibilityForContact,
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

  const [oneReadSub, filmHolder, oneReadElig, oneFilmElig] = await Promise.all([
    prisma.productSubscription.findUnique({
      where: { contactId_productKey: { contactId: sub.contactId, productKey: ONE_READ_PRODUCT_KEY } },
    }),
    prisma.productSubscription.findUnique({
      where: { contactId_productKey: { contactId: sub.contactId, productKey: ONE_FILM_PRODUCT_KEY } },
      include: { filmPreferences: true },
    }),
    resolveOneArticleEligibilityForContact(sub.contactId),
    resolveOneFilmEligibilityForContact(sub.contactId),
  ]);

  const [deliveries, auditEvents] = await Promise.all([
    prisma.oneArticleDelivery.findMany({
      where: { contactId: sub.contactId },
      include: { issue: { select: { id: true, headline: true, readingLanguage: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    loadAuditLogs({ targetType: "ProductSubscription", q: sub.id }, 20),
  ]);

  const lastDelivery = deliveries.find((delivery) => delivery.status === "SENT");

  return (
    <AdminShell
      title={sub.contact.email}
      subtitle="OneArticle subscription detail"
      actions={
        <Link href="/admin/users" className="text-[13px] text-admin-body hover:text-admin-ink">
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
              ["Created", fmtDateTime(sub.contact.createdAt)],
              ["Updated", fmtDateTime(sub.contact.updatedAt)],
              ["Email delivery", <StatusBadge key="e" value={sub.emailDeliveryStatus} />],
              ["Email verified", lastVerified?.consumedAt ? fmtDateTime(lastVerified.consumedAt) : "Not verified"],
              ["Last verification request", fmtDateTime(lastVerificationRequest?.createdAt ?? null)],
            ]}
          />
        </AdminCard>

        <AdminCard title="Eligibility">
          <div className="px-4 py-4">
            <EligibilityBadge allowed={elig.allowed} reason={elig.reason} />
            <p className="mt-3 text-[12.5px] text-admin-body font-sans">
              {elig.allowed
                ? "This subscriber will receive scheduled OneArticle editions in their reading language."
                : "This subscriber is not receiving emails right now. The badge above shows why."}
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
            ["Included products", oneReadSub ? "OneArticle" : "—"],
            [
              "OneArticle eligibility",
              <EligibilityBadge key="a" allowed={oneReadElig.allowed} reason={oneReadElig.reason} />,
            ],
            [
              "Historical OneFilm status",
              filmHolder ? <StatusBadge key="fs" value={filmHolder.status} /> : "No OneFilm record",
            ],
            [
              "Historical OneFilm eligibility",
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
        <div className="p-4 border-b border-admin-line">
          <PreferencesEditor
            subId={sub.id}
            summaryLanguages={SUMMARY_LANGUAGES}
            current={{
              summaryLanguage: prefs?.summaryLanguage ?? null,
            }}
          />
        </div>
        {prefs ? (
          <DefList
            rows={[
              ["Reading language", prefs.summaryLanguage ?? "—"],
              ["Timezone", prefs.timezone ?? "—"],
              ["Created", fmtDateTime(prefs.createdAt)],
              ["Updated", fmtDateTime(prefs.updatedAt)],
            ]}
          />
        ) : (
          <div className="px-4 py-6 text-[13px] text-admin-muted">
            Preferences saved, checkout not completed — or preferences not yet set.
          </div>
        )}
      </AdminCard>

      <AdminCard
        title="Activity — recent deliveries"
        subtitle={lastDelivery ? `last delivered ${fmtDateTime(lastDelivery.sentAt)}` : "no deliveries yet"}
      >
        <AdminTable
          head={["Updated", "Edition", "Language", "Status", "Attempts", "Sent at", "Note"]}
          empty="No OneArticle deliveries recorded for this subscriber yet."
          rows={deliveries.map((delivery) => [
            <span key="d" className="text-admin-body">{fmtDateTime(delivery.updatedAt)}</span>,
            <Link key="i" href={`/admin/one-article/issues/${delivery.issue.id}`} className="text-admin-ink underline underline-offset-2">
              {delivery.issue.headline || "Untitled edition"}
            </Link>,
            <span key="l" className="text-admin-body">{delivery.issue.readingLanguage}</span>,
            <StatusBadge key="s" value={delivery.status} />,
            delivery.attemptCount,
            <span key="sa" className="text-admin-body">{fmtDateTime(delivery.sentAt)}</span>,
            <span key="n" className="text-[11.5px] text-dawn">
              {delivery.failedReason ?? delivery.skippedReason ?? "—"}
            </span>,
          ])}
        />
      </AdminCard>

      <AdminCard title="Audit history" subtitle="Recent admin actions on this subscriber">
        <AdminTable
          head={["Date", "Action", "Actor", "Metadata"]}
          empty="No audit events for this user yet."
          rows={auditEvents.map((event) => [
            <span key="d" className="text-admin-body">{fmtDateTime(event.createdAt)}</span>,
            <StatusBadge key="a" value={event.action} tone="neutral" />,
            <span key="actor" className="font-mono text-[11.5px] text-admin-body">{event.actor}</span>,
            <span key="m" className="text-[11.5px] text-admin-body">
              {summarizeAuditMetadata(event.metadata)}
            </span>,
          ])}
        />
      </AdminCard>

      <Details summary="Technical details — internal IDs">
        <DefList
          rows={[
            ["Contact ID", <MonoShort key="c" value={sub.contact.id} />],
            ["Unsubscribe token", <MonoShort key="u" value={sub.unsubscribeToken} />],
            ["Provider customer ID", <MonoShort key="pc" value={sub.providerCustomerId} />],
            ["Provider subscription ID", <MonoShort key="ps" value={sub.providerSubscriptionId} />],
            ["Checkout session ID", <MonoShort key="ch" value={sub.providerCheckoutSessionId} />],
          ]}
        />
      </Details>
    </AdminShell>
  );
}
