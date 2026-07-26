import Link from "next/link";
import { notFound } from "next/navigation";
import { guardAdminPage } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList } from "@/components/admin/AdminCard";
import { Details } from "@/components/admin/Details";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge, EligibilityBadge } from "@/components/admin/StatusBadge";
import { fmtDateTime, yesNo } from "@/lib/admin/format";
import { UserActionsBar } from "@/components/admin/UserActionsBar";
import {
  resolveOneArticleEligibilityForContact,
  resolveOneFilmEligibilityForContact,
} from "@/lib/oneread/access";

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
  const guard = guardAdminPage(`/admin/users/${params.id}`, searchParams);
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
  if (!contact) notFound();

  const umbrella = contact.subscriptions.find((sub) => sub.productKey === "one-read");
  const article = contact.subscriptions.find((sub) => sub.productKey === "one-article");
  const film = contact.subscriptions.find((sub) => sub.productKey === "one-film");
  const actionSubscription = umbrella ?? article ?? film;
  const articlePrefs = article?.preferences;
  const filmPrefs = film?.filmPreferences;

  const [
    lastVerificationRequest,
    lastVerified,
    articleEligibility,
    filmEligibility,
    articleDeliveries,
    filmDeliveries,
  ] = await Promise.all([
    prisma.emailVerificationCode.findFirst({
      where: { email: contact.email },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.emailVerificationCode.findFirst({
      where: { email: contact.email, consumedAt: { not: null } },
      orderBy: { consumedAt: "desc" },
      select: { consumedAt: true },
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

  return (
    <AdminShell
      title={contact.email}
      subtitle="Complete OneRead contact, subscription, and preference detail"
      actions={<Link href="/admin/users" className="text-[13px] text-admin-body hover:text-admin-ink">← All users</Link>}
    >
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
            ["Created", fmtDateTime(contact.createdAt)],
            ["Updated", fmtDateTime(contact.updatedAt)],
            ["Email verified", lastVerified?.consumedAt ? fmtDateTime(lastVerified.consumedAt) : "Not verified"],
            ["Last verification request", fmtDateTime(lastVerificationRequest?.createdAt ?? null)],
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
          head={["Product", "Access", "Delivery", "Provider", "Plan", "Trial ends", "Period ends", "Override", "Admin note"]}
          rows={contact.subscriptions.map((sub) => [
            sub.productKey,
            <StatusBadge key="s" value={sub.status} />,
            <StatusBadge key="d" value={sub.emailDeliveryStatus} />,
            sub.paymentProvider ?? "—",
            sub.plan ?? "—",
            fmtDateTime(sub.trialEndsAt),
            fmtDateTime(sub.currentPeriodEnd),
            yesNo(sub.adminOverride),
            sub.adminNote ?? "—",
          ])}
          empty="No product subscriptions."
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
