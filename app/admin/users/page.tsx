import Link from "next/link";
import { guardAdminPage, configuredAdminEmails } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import {
  AdminCard,
  MetricCard,
  MetricGrid,
} from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { fmtDateTime } from "@/lib/admin/format";
import { CreateUserButton } from "@/components/admin/CreateUserButton";
import { prisma } from "@/lib/prisma";
import {
  analyzeUserJourney,
  userRole,
  type UserJourneyStage,
  type UserPaymentState,
  type UserPreferenceState,
  type UserVerificationState,
} from "@/lib/admin/user-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Filters = {
  q?: string;
  role?: string;
  journey?: string;
  payment?: string;
  preferences?: string;
  verification?: string;
  status?: string;
};

export default async function AdminUsersPage(
  props: { searchParams: Promise<Filters> },
) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/users", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [contacts, verificationEvents] = await Promise.all([
    prisma.contact.findMany({
      include: {
        subscriptions: {
          include: { preferences: true, filmPreferences: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.emailVerificationCode.findMany({
      select: {
        id: true,
        email: true,
        purpose: true,
        createdAt: true,
        consumedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const adminEmails = configuredAdminEmails();
  const verificationByEmail = new Map<string, {
    latestId: string;
    requestedAt: Date;
    verifiedAt: Date | null;
    requestCount: number;
  }>();
  for (const event of verificationEvents) {
    const email = event.email.trim().toLowerCase();
    const current = verificationByEmail.get(email);
    if (!current) {
      verificationByEmail.set(email, {
        latestId: event.id,
        requestedAt: event.createdAt,
        verifiedAt: event.consumedAt,
        requestCount: 1,
      });
    } else {
      current.requestCount += 1;
      if (event.consumedAt && (!current.verifiedAt || event.consumedAt > current.verifiedAt)) {
        current.verifiedAt = event.consumedAt;
      }
    }
  }

  const contactEmails = new Set(contacts.map((contact) => contact.email.toLowerCase()));
  type ContactRecord = (typeof contacts)[number];
  type VerificationSummary = {
    latestId: string;
    requestedAt: Date;
    verifiedAt: Date | null;
    requestCount: number;
  };
  type UserRow = {
    key: string;
    detailId: string | null;
    email: string;
    contact: ContactRecord | null;
    verification: VerificationSummary | undefined;
    role: "ADMIN" | "USER";
    journey: ReturnType<typeof analyzeUserJourney>;
    createdAt: Date | null;
    lastActivityAt: Date | null;
  };
  const rows: UserRow[] = contacts.map((contact) => {
    const verification = verificationByEmail.get(contact.email.toLowerCase());
    const journey = analyzeUserJourney({
      subscriptions: contact.subscriptions,
      verificationRequested: Boolean(verification),
      verified: Boolean(verification?.verifiedAt),
    });
    return {
      key: contact.id,
      detailId: contact.id,
      email: contact.email,
      contact,
      verification,
      role: userRole(contact.email, adminEmails),
      journey,
      createdAt: contact.createdAt,
      lastActivityAt: latestDate([
        contact.updatedAt,
        verification?.requestedAt,
        ...contact.subscriptions.map((sub) => sub.updatedAt),
        ...contact.subscriptions.map((sub) => sub.lastSentAt),
      ]),
    };
  });

  for (const [email, verification] of verificationByEmail) {
    if (contactEmails.has(email)) continue;
    rows.push({
      key: `verification-${verification.latestId}`,
      detailId: verification.latestId,
      email,
      contact: null,
      verification,
      role: userRole(email, adminEmails),
      journey: analyzeUserJourney({
        subscriptions: [],
        verificationRequested: true,
        verified: Boolean(verification.verifiedAt),
      }),
      createdAt: verification.requestedAt,
      lastActivityAt: verification.requestedAt,
    });
  }

  const knownEmails = new Set(rows.map((row) => row.email.toLowerCase()));
  for (const email of adminEmails) {
    if (knownEmails.has(email.toLowerCase())) continue;
    rows.push({
      key: `admin-${email}`,
      detailId: null,
      email,
      contact: null,
      verification: undefined,
      role: "ADMIN" as const,
      journey: analyzeUserJourney({
        subscriptions: [],
        verificationRequested: false,
        verified: false,
      }),
      createdAt: null,
      lastActivityAt: null,
    });
  }

  rows.sort((a, b) =>
    (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0),
  );

  const totals = {
    identities: rows.length,
    admins: rows.filter((row) => row.role === "ADMIN").length,
    paying: rows.filter((row) => row.journey.payment === "PAYING").length,
    neverPaid: rows.filter((row) => row.journey.payment === "NEVER_PAID").length,
    choicesMissing: rows.filter((row) =>
      row.journey.preferences === "NOT_STARTED"
      || row.journey.preferences === "PARTIAL",
    ).length,
    unverified: rows.filter((row) => row.journey.verification !== "VERIFIED").length,
  };

  let filteredRows = rows;
  if (searchParams.q) {
    const needle = searchParams.q.toLowerCase();
    filteredRows = filteredRows.filter((row) => row.email.toLowerCase().includes(needle));
  }
  if (searchParams.role) {
    filteredRows = filteredRows.filter((row) => row.role === searchParams.role);
  }
  if (searchParams.journey) {
    filteredRows = filteredRows.filter((row) => row.journey.stage === searchParams.journey);
  }
  if (searchParams.payment) {
    filteredRows = filteredRows.filter((row) => row.journey.payment === searchParams.payment);
  }
  if (searchParams.preferences) {
    filteredRows = filteredRows.filter(
      (row) => row.journey.preferences === searchParams.preferences,
    );
  }
  if (searchParams.verification) {
    filteredRows = filteredRows.filter(
      (row) => row.journey.verification === searchParams.verification,
    );
  }
  if (searchParams.status) {
    filteredRows = filteredRows.filter((row) =>
      row.contact?.subscriptions.some((sub) => sub.status === searchParams.status),
    );
  }

  return (
    <AdminShell
      title="Users"
      subtitle={`${filteredRows.length} of ${rows.length} known identities · contacts, signup leads, and admins`}
      actions={
        <>
          <a
            href="/api/admin/users/export"
            className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-[12.5px] text-admin-ink hover:bg-admin-sink"
          >
            Download CSV
          </a>
          <CreateUserButton />
        </>
      }
    >
      <MetricGrid>
        <MetricCard label="Known identities" value={totals.identities} hint="Contacts + signup leads + admins" />
        <MetricCard label="Admins" value={totals.admins} hint="Can sign in to this panel" tone="good" />
        <MetricCard label="Paying now" value={totals.paying} hint="Active paid subscriptions" tone="good" />
        <MetricCard label="Never paid" value={totals.neverPaid} hint="No completed payment detected" />
        <MetricCard label="Selections missing" value={totals.choicesMissing} hint="No or partial preferences" tone={totals.choicesMissing ? "warn" : "default"} />
        <MetricCard label="Not verified" value={totals.unverified} hint="Includes email-only signup leads" tone={totals.unverified ? "warn" : "default"} />
      </MetricGrid>

      <AdminCard
        title="Filters"
        subtitle="Combine filters to isolate conversion and onboarding gaps"
        bodyClassName="p-4"
      >
        <form method="get" className="flex flex-wrap items-end gap-3 text-[12.5px] font-sans">
          <FilterInput
            name="q"
            label="Search email"
            defaultValue={searchParams.q ?? ""}
            placeholder="email contains…"
          />
          <FilterSelect name="role" label="Role" value={searchParams.role} options={ROLES} />
          <FilterSelect name="journey" label="Journey" value={searchParams.journey} options={JOURNEYS} />
          <FilterSelect name="payment" label="Payment" value={searchParams.payment} options={PAYMENTS} />
          <FilterSelect name="preferences" label="Selections" value={searchParams.preferences} options={PREFERENCES} />
          <FilterSelect name="verification" label="Verification" value={searchParams.verification} options={VERIFICATIONS} />
          <FilterSelect name="status" label="Raw access status" value={searchParams.status} options={STATUSES} />
          <button type="submit" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-admin-ink hover:bg-admin-sink">
            Apply
          </button>
          <Link href="/admin/users" className="px-2 py-1.5 text-admin-muted hover:text-admin-ink">
            Reset
          </Link>
        </form>
      </AdminCard>

      <AdminCard
        title="Identity overview"
        subtitle="Journey is derived from verification, preferences, billing, and access — not a single raw field"
      >
        <AdminTable
          head={[
            "Email",
            "Role",
            "Journey",
            "Verification",
            "Selections",
            "Payment",
            "Products",
            "Email delivery",
            "Last activity",
            "",
          ]}
          empty="No identities match these filters."
          rows={filteredRows.map((row) => {
            const subscriptions = row.contact?.subscriptions ?? [];
            const article = subscriptions.find((sub) => sub.productKey === "one-article");
            const film = subscriptions.find((sub) => sub.productKey === "one-film");
            return [
              <div key="email" className="min-w-52">
                <div className="font-medium text-admin-ink">{row.email}</div>
                <div className="mt-0.5 text-[10.5px] text-admin-muted">
                  {row.contact
                    ? `Contact · ${subscriptions.length} product row${subscriptions.length === 1 ? "" : "s"}`
                    : row.verification
                      ? `Signup lead · ${row.verification.requestCount} verification request${row.verification.requestCount === 1 ? "" : "s"}`
                      : "Admin configuration only"}
                </div>
              </div>,
              <StatusBadge key="role" value={row.role} />,
              <StatusBadge key="journey" value={row.journey.stage} />,
              <StatusBadge key="verification" value={row.journey.verification} />,
              <div key="preferences" className="space-y-1">
                <StatusBadge
                  value={row.journey.preferences}
                  title={row.journey.missingPreferenceProducts.length
                    ? `Missing: ${row.journey.missingPreferenceProducts.join(", ")}`
                    : undefined}
                />
                {row.journey.expectedPreferenceProducts > 0 && (
                  <div className="text-[10.5px] text-admin-muted">
                    {row.journey.completedPreferenceProducts}/{row.journey.expectedPreferenceProducts} products
                  </div>
                )}
              </div>,
              <StatusBadge key="payment" value={row.journey.payment} />,
              <ProductSummary key="products" subscriptions={subscriptions} />,
              <div key="delivery" className="space-y-1">
                {article && <StatusBadge value={article.emailDeliveryStatus} />}
                {film && <StatusBadge value={film.emailDeliveryStatus} />}
                {!article && !film && <span className="text-admin-muted">—</span>}
              </div>,
              <span key="activity" className="whitespace-nowrap text-admin-body">
                {fmtDateTime(row.lastActivityAt)}
              </span>,
              row.detailId ? (
                <Link
                  key="view"
                  href={`/admin/users/${row.detailId}`}
                  className="text-admin-ink underline underline-offset-2"
                >
                  View
                </Link>
              ) : (
                <span key="view" className="text-[11px] text-admin-muted">Config only</span>
              ),
            ];
          })}
        />
      </AdminCard>

      <AdminCard title="Configured panel admins" subtitle="These accounts have the same panel permissions">
        <AdminTable
          head={["Admin email", "Contact record", "Verification", "Current customer"]}
          rows={adminEmails.map((email) => {
            const record = rows.find((row) => row.email.toLowerCase() === email.toLowerCase());
            return [
              <span key="email" className="text-admin-ink">{email}</span>,
              record?.contact ? "Yes" : "No",
              record ? <StatusBadge key="verification" value={record.journey.verification} /> : "—",
              record?.journey.payment === "PAYING" ? "Yes" : "No",
            ];
          })}
          empty="No additional browser-login admins are configured."
        />
      </AdminCard>
    </AdminShell>
  );
}

function latestDate(values: Array<Date | null | undefined>): Date | null {
  return values.reduce<Date | null>((latest, value) => {
    if (!value) return latest;
    return !latest || value > latest ? value : latest;
  }, null);
}

function ProductSummary({
  subscriptions,
}: {
  subscriptions: Array<{ productKey: string; status: string }>;
}) {
  if (!subscriptions.length) return <span className="text-admin-muted">—</span>;
  return (
    <div className="min-w-40 space-y-1">
      {subscriptions.map((sub) => (
        <div key={sub.productKey} className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-admin-muted">
            {PRODUCT_LABELS[sub.productKey] ?? sub.productKey}
          </span>
          <StatusBadge value={sub.status} />
        </div>
      ))}
    </div>
  );
}

function FilterInput({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">{label}</span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-56 rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink"
      />
    </label>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: readonly string[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {OPTION_LABELS[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

const PRODUCT_LABELS: Record<string, string> = {
  "one-read": "OneRead",
  "one-article": "Article",
  "one-film": "Film",
  "one-lingo": "Lingo",
};

const OPTION_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  USER: "Reader",
  EMAIL_ONLY: "Email only",
  UNVERIFIED: "Not verified",
  NO_PREFERENCES: "No selections",
  PARTIAL_PREFERENCES: "Selections incomplete",
  AWAITING_PAYMENT: "Never paid / awaiting payment",
  TRIAL: "On trial",
  ACTIVE: "Active customer",
  MANUAL_ACCESS: "Manual access",
  PAYMENT_ISSUE: "Payment issue",
  INACTIVE: "Former customer",
  NEVER_PAID: "Never paid",
  PAYING: "Paying",
  PAYMENT_OVERDUE: "Payment overdue",
  CANCELED: "Canceled",
  FORMER_PAYER: "Former payer",
  NOT_STARTED: "Not started",
  PARTIAL: "Partial",
  COMPLETE: "Complete",
  NOT_APPLICABLE: "Not applicable",
  NOT_REQUESTED: "Not requested",
  PENDING_VERIFICATION: "Verification pending",
  VERIFIED: "Verified",
};

const ROLES = ["ADMIN", "USER"] as const;
const JOURNEYS: readonly UserJourneyStage[] = [
  "EMAIL_ONLY",
  "UNVERIFIED",
  "NO_PREFERENCES",
  "PARTIAL_PREFERENCES",
  "AWAITING_PAYMENT",
  "TRIAL",
  "ACTIVE",
  "MANUAL_ACCESS",
  "PAYMENT_ISSUE",
  "INACTIVE",
];
const PAYMENTS: readonly UserPaymentState[] = [
  "NEVER_PAID",
  "TRIAL",
  "PAYING",
  "PAYMENT_OVERDUE",
  "CANCELED",
  "FORMER_PAYER",
  "MANUAL_ACCESS",
];
const PREFERENCES: readonly UserPreferenceState[] = [
  "NOT_STARTED",
  "PARTIAL",
  "COMPLETE",
  "NOT_APPLICABLE",
];
const VERIFICATIONS: readonly UserVerificationState[] = [
  "NOT_REQUESTED",
  "PENDING_VERIFICATION",
  "VERIFIED",
];
const STATUSES = [
  "ACTIVE_PAID",
  "TRIALING",
  "ADMIN_OVERRIDE",
  "PENDING_CHECKOUT",
  "PENDING_PREFERENCES",
  "PAST_DUE",
  "CANCELED",
  "TRIAL_EXPIRED",
  "EXPIRED",
] as const;
