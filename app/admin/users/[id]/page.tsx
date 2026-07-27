import Link from "next/link";
import { notFound } from "next/navigation";
import type { EmailVerificationCode } from "@prisma/client";
import { configuredAdminEmails, guardAdminPage } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import {
  AdminCard,
  DefList,
  MetricCard,
  MetricGrid,
} from "@/components/admin/AdminCard";
import { Details } from "@/components/admin/Details";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge, EligibilityBadge } from "@/components/admin/StatusBadge";
import { fmtDateTime, yesNo } from "@/lib/admin/format";
import { UserActionsBar } from "@/components/admin/UserActionsBar";
import {
  resolveOneArticleEligibilityForContact,
  resolveOneFilmEligibilityForContact,
} from "@/lib/oneread/access";
import { analyzeUserJourney, userRole } from "@/lib/admin/user-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const guard = await guardAdminPage(`/admin/users/${params.id}`, searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  let contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      subscriptions: {
        include: { preferences: true, filmPreferences: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Backwards-compatible with old links that used a ProductSubscription id.
  if (!contact) {
    const subscription = await prisma.productSubscription.findUnique({
      where: { id: params.id },
      select: { contactId: true },
    });
    if (subscription) {
      contact = await prisma.contact.findUnique({
        where: { id: subscription.contactId },
        include: {
          subscriptions: {
            include: { preferences: true, filmPreferences: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }
  }
  if (!contact) {
    const verificationLead = await prisma.emailVerificationCode.findUnique({
      where: { id: params.id },
      select: { email: true },
    });
    if (!verificationLead) notFound();

    const contactCreatedSinceLink = await prisma.contact.findUnique({
      where: { email: verificationLead.email },
      include: {
        subscriptions: {
          include: { preferences: true, filmPreferences: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (contactCreatedSinceLink) {
      contact = contactCreatedSinceLink;
    } else {
      const events = await prisma.emailVerificationCode.findMany({
        where: { email: verificationLead.email },
        orderBy: { createdAt: "desc" },
      });
      return (
        <VerificationLeadDetail
          email={verificationLead.email}
          events={events}
          isAdmin={userRole(verificationLead.email, configuredAdminEmails()) === "ADMIN"}
        />
      );
    }
  }

  const umbrella = contact.subscriptions.find((sub) => sub.productKey === "one-read");
  const article = contact.subscriptions.find((sub) => sub.productKey === "one-article");
  const film = contact.subscriptions.find((sub) => sub.productKey === "one-film");
  const actionSubscription = umbrella ?? article ?? film;
  const articlePrefs = article?.preferences;
  const filmPrefs = film?.filmPreferences;

  const [
    verificationEvents,
    articleEligibility,
    filmEligibility,
    articleDeliveries,
    filmDeliveries,
  ] = await Promise.all([
    prisma.emailVerificationCode.findMany({
      where: { email: contact.email },
      orderBy: { createdAt: "desc" },
    }),
    resolveOneArticleEligibilityForContact(contact.id),
    resolveOneFilmEligibilityForContact(contact.id),
    prisma.oneArticleDelivery.findMany({
      where: { contactId: contact.id },
      include: { issue: { select: { headline: true, readingLanguage: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.oneFilmDelivery.findMany({
      where: { contactId: contact.id },
      include: { issue: { select: { filmTitle: true, emailLanguage: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);
  const lastVerificationRequest = verificationEvents[0];
  const lastVerified = verificationEvents.find((event) => event.consumedAt);
  const role = userRole(contact.email, configuredAdminEmails());
  const journey = analyzeUserJourney({
    subscriptions: contact.subscriptions,
    verificationRequested: verificationEvents.length > 0,
    verified: Boolean(lastVerified?.consumedAt),
  });

  return (
    <AdminShell
      title={contact.email}
      subtitle="Complete OneRead contact, subscription, and preference detail"
      actions={<Link href="/admin/users" className="text-[13px] text-admin-body hover:text-admin-ink">← All users</Link>}
    >
      <MetricGrid>
        <MetricCard
          label="Role"
          value={<StatusBadge value={role} />}
          hint={role === "ADMIN" ? "Can sign in to the panel" : "Customer / signup identity"}
          tone={role === "ADMIN" ? "good" : "default"}
        />
        <MetricCard
          label="Journey"
          value={<StatusBadge value={journey.stage} />}
          hint="Overall onboarding and access state"
        />
        <MetricCard
          label="Payment"
          value={<StatusBadge value={journey.payment} />}
          hint={journey.hasPaidEver ? "A completed payment is on record" : "No completed payment detected"}
          tone={journey.payment === "PAYING" ? "good" : "default"}
        />
        <MetricCard
          label="Selections"
          value={<StatusBadge value={journey.preferences} />}
          hint={journey.expectedPreferenceProducts
            ? `${journey.completedPreferenceProducts}/${journey.expectedPreferenceProducts} products complete`
            : "No product setup started"}
        />
      </MetricGrid>

      <AdminCard
        title="Onboarding checklist"
        subtitle="Exactly what this person has completed — and what is still missing"
      >
        <DefList rows={[
          ["Identity role", <StatusBadge key="role" value={role} />],
          ["Email ownership", <StatusBadge key="verification" value={journey.verification} />],
          ["OneArticle selections", articlePrefs ? <StatusBadge key="done" value="COMPLETE" /> : <StatusBadge key="missing" value="NOT_STARTED" />],
          ["OneFilm selections", filmPrefs ? <StatusBadge key="done" value="COMPLETE" /> : <StatusBadge key="missing" value="NOT_STARTED" />],
          ["Payment", <StatusBadge key="payment" value={journey.payment} />],
          ["Email eligibility", (
            <span key="eligibility" className="flex flex-wrap gap-2">
              <EligibilityBadge allowed={articleEligibility.allowed} reason={articleEligibility.reason} />
              <span className="text-admin-muted">OneArticle</span>
              <EligibilityBadge allowed={filmEligibility.allowed} reason={filmEligibility.reason} />
              <span className="text-admin-muted">OneFilm</span>
            </span>
          )],
          ["Missing next steps", journey.missingPreferenceProducts.length
            ? `Complete ${journey.missingPreferenceProducts.join(" and ")} selections`
            : journey.payment === "NEVER_PAID"
              ? "Complete checkout"
              : "None"],
        ]} />
      </AdminCard>

      {actionSubscription && (
        <AdminCard title="Actions" bodyClassName="p-4">
          <UserActionsBar
            subId={actionSubscription.id}
            email={contact.email}
            emailDeliveryStatus={actionSubscription.emailDeliveryStatus}
            adminOverride={actionSubscription.adminOverride}
          />
        </AdminCard>
      )}

      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
        <AdminCard title="Contact">
          <DefList rows={[
            ["Email", contact.email],
            ["Role", <StatusBadge key="role" value={role} />],
            ["Created", fmtDateTime(contact.createdAt)],
            ["Updated", fmtDateTime(contact.updatedAt)],
            ["Email verified", lastVerified?.consumedAt ? fmtDateTime(lastVerified.consumedAt) : "Not verified"],
            ["Last verification request", fmtDateTime(lastVerificationRequest?.createdAt ?? null)],
            ["Verification requests", verificationEvents.length],
          ]} />
        </AdminCard>
        <AdminCard title="Product eligibility">
          <DefList rows={[
            ["OneArticle", <EligibilityBadge key="a" allowed={articleEligibility.allowed} reason={articleEligibility.reason} />],
            ["OneFilm", <EligibilityBadge key="f" allowed={filmEligibility.allowed} reason={filmEligibility.reason} />],
          ]} />
        </AdminCard>
      </div>

      <AdminCard title="Subscriptions" subtitle="Every product row belonging to this contact">
        <AdminTable
          head={[
            "Product",
            "Access",
            "Delivery",
            "Provider",
            "Plan",
            "Paid at",
            "Trial ends",
            "Period ends",
            "Cancel at end",
            "Override",
            "Created",
            "Admin note",
          ]}
          rows={contact.subscriptions.map((sub) => [
            sub.productKey,
            <StatusBadge key="s" value={sub.status} />,
            <StatusBadge key="d" value={sub.emailDeliveryStatus} />,
            sub.paymentProvider ?? "—",
            sub.plan ?? "—",
            fmtDateTime(sub.paidAt),
            fmtDateTime(sub.trialEndsAt),
            fmtDateTime(sub.currentPeriodEnd),
            yesNo(sub.cancelAtPeriodEnd),
            yesNo(sub.adminOverride),
            fmtDateTime(sub.createdAt),
            sub.adminNote ?? "—",
          ])}
          empty="No product subscriptions."
        />
      </AdminCard>

      <AdminCard
        title="Email verification history"
        subtitle="Every code request; raw verification codes are never stored"
      >
        <AdminTable
          head={["Requested", "Purpose", "Result", "Consumed", "Attempts", "Expired at"]}
          rows={verificationEvents.map((event) => [
            fmtDateTime(event.createdAt),
            event.purpose,
            <StatusBadge key="status" value={event.consumedAt ? "VERIFIED" : "PENDING_VERIFICATION"} />,
            fmtDateTime(event.consumedAt),
            `${event.attempts}/${event.maxAttempts}`,
            fmtDateTime(event.expiresAt),
          ])}
          empty="No verification request has been recorded for this email."
        />
      </AdminCard>

      <AdminCard title="OneArticle preferences">
        {articlePrefs ? (
          <DefList rows={[
            ["Interests", articlePrefs.interests.join(", ") || "—"],
            ["Primary interest", articlePrefs.primaryInterest ?? "—"],
            ["Secondary interests", articlePrefs.secondaryInterests.join(", ") || "—"],
            ["Source language", articlePrefs.sourceLanguage ?? "—"],
            ["Reading language", articlePrefs.summaryLanguage ?? "—"],
            ["Timezone", articlePrefs.timezone ?? "—"],
            ["Delivery hour", `${articlePrefs.deliveryHour}:00`],
            ["Difficulty", articlePrefs.preferredDifficulty],
            ["Recently sent topics", articlePrefs.recentlySentTopics.join(", ") || "—"],
            ["Created", fmtDateTime(articlePrefs.createdAt)],
            ["Updated", fmtDateTime(articlePrefs.updatedAt)],
          ]} />
        ) : <EmptyPreferences product="OneArticle" />}
      </AdminCard>

      <AdminCard title="OneFilm preferences">
        {filmPrefs ? (
          <DefList rows={[
            ["Email language", filmPrefs.emailLanguage],
            ["Genres", filmPrefs.preferredGenres.join(", ") || "—"],
            ["Moods", filmPrefs.moods.join(", ") || "Any"],
            ["Decades", filmPrefs.decades.join(", ") || "Any"],
            ["Original languages", filmPrefs.languages.join(", ") || "Any"],
            ["Platforms", filmPrefs.platforms.join(", ") || "Any"],
            ["Spoiler preference", filmPrefs.spoilerPreference],
            ["Discovery style", filmPrefs.familiarity],
            ["Runtime preference", filmPrefs.runtimePreference],
            ["Created", fmtDateTime(filmPrefs.createdAt)],
            ["Updated", fmtDateTime(filmPrefs.updatedAt)],
          ]} />
        ) : <EmptyPreferences product="OneFilm" />}
      </AdminCard>

      <AdminCard title="Recent OneArticle deliveries">
        <AdminTable
          head={["Updated", "Edition", "Language", "Status", "Attempts", "Sent at", "Note"]}
          rows={articleDeliveries.map((delivery) => [
            fmtDateTime(delivery.updatedAt),
            delivery.issue.headline || "Untitled edition",
            delivery.issue.readingLanguage,
            <StatusBadge key="s" value={delivery.status} />,
            delivery.attemptCount,
            fmtDateTime(delivery.sentAt),
            delivery.failedReason ?? delivery.skippedReason ?? "—",
          ])}
          empty="No OneArticle deliveries."
        />
      </AdminCard>

      <AdminCard title="Recent OneFilm deliveries">
        <AdminTable
          head={["Updated", "Film", "Language", "Status", "Attempts", "Sent at", "Note"]}
          rows={filmDeliveries.map((delivery) => [
            fmtDateTime(delivery.updatedAt),
            delivery.issue.filmTitle || "Untitled film",
            delivery.issue.emailLanguage,
            <StatusBadge key="s" value={delivery.status} />,
            delivery.attemptCount,
            fmtDateTime(delivery.sentAt),
            delivery.failedReason ?? delivery.skippedReason ?? "—",
          ])}
          empty="No OneFilm deliveries."
        />
      </AdminCard>

      <Details summary="Technical details — internal IDs">
        <DefList rows={[
          ["Contact ID", <MonoShort key="c" value={contact.id} />],
          ["OneRead subscription ID", <MonoShort key="or" value={umbrella?.id} />],
          ["OneArticle subscription ID", <MonoShort key="oa" value={article?.id} />],
          ["OneFilm subscription ID", <MonoShort key="of" value={film?.id} />],
          ["Provider customer ID", <MonoShort key="pc" value={umbrella?.providerCustomerId} />],
          ["Provider subscription ID", <MonoShort key="ps" value={umbrella?.providerSubscriptionId} />],
        ]} />
      </Details>
    </AdminShell>
  );
}

function EmptyPreferences({ product }: { product: string }) {
  return <div className="px-4 py-6 text-[13px] text-admin-muted">{product} preferences have not been saved yet.</div>;
}

function VerificationLeadDetail({
  email,
  events,
  isAdmin,
}: {
  email: string;
  events: EmailVerificationCode[];
  isAdmin: boolean;
}) {
  const verifiedEvent = events.find((event) => event.consumedAt);
  const journey = analyzeUserJourney({
    subscriptions: [],
    verificationRequested: events.length > 0,
    verified: Boolean(verifiedEvent),
  });

  return (
    <AdminShell
      title={email}
      subtitle="Email-only signup lead — no Contact or subscription has been created"
      actions={<Link href="/admin/users" className="text-[13px] text-admin-body hover:text-admin-ink">← All users</Link>}
    >
      <MetricGrid>
        <MetricCard
          label="Role"
          value={<StatusBadge value={isAdmin ? "ADMIN" : "USER"} />}
          hint={isAdmin ? "Can sign in to the panel" : "Public signup identity"}
          tone={isAdmin ? "good" : "default"}
        />
        <MetricCard label="Journey" value={<StatusBadge value={journey.stage} />} hint="Stopped before account setup" tone="warn" />
        <MetricCard label="Payment" value={<StatusBadge value="NEVER_PAID" />} hint="No subscription or checkout exists" />
        <MetricCard label="Selections" value={<StatusBadge value="NOT_STARTED" />} hint="No product preferences exist" tone="warn" />
      </MetricGrid>

      <AdminCard title="What we know">
        <DefList rows={[
          ["Email", email],
          ["Role", <StatusBadge key="role" value={isAdmin ? "ADMIN" : "USER"} />],
          ["Email verification", <StatusBadge key="verification" value={journey.verification} />],
          ["First request", fmtDateTime(events.at(-1)?.createdAt ?? null)],
          ["Last request", fmtDateTime(events[0]?.createdAt ?? null)],
          ["Verification requests", events.length],
          ["Contact record", "Not created"],
          ["Product subscriptions", "None"],
          ["Payment", "Never paid"],
          ["Preferences", "No selections saved"],
        ]} />
      </AdminCard>

      <AdminCard
        title="Email verification history"
        subtitle="This is the full activity available before a Contact exists"
      >
        <AdminTable
          head={["Requested", "Purpose", "Result", "Consumed", "Attempts", "Expired at"]}
          rows={events.map((event) => [
            fmtDateTime(event.createdAt),
            event.purpose,
            <StatusBadge key="status" value={event.consumedAt ? "VERIFIED" : "PENDING_VERIFICATION"} />,
            fmtDateTime(event.consumedAt),
            `${event.attempts}/${event.maxAttempts}`,
            fmtDateTime(event.expiresAt),
          ])}
          empty="No verification requests."
        />
      </AdminCard>
    </AdminShell>
  );
}
