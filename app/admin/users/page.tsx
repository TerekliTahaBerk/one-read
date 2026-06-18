import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge, EligibilityBadge } from "@/components/admin/StatusBadge";
import { loadOneArticleSubs, toSubRow } from "@/lib/admin/queries";
import { fmtDate } from "@/lib/admin/format";
import { CreateUserButton } from "@/components/admin/CreateUserButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/users — OneRead contacts with their OneArticle subscription state. */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: {
    token?: string;
    status?: string;
    email_status?: string;
    provider?: string;
    q?: string;
    override?: string;
    suppressed?: string;
  };
}) {
  const guard = guardAdminPage(searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const { token } = guard;
  const tokenQ = `token=${encodeURIComponent(token)}`;

  const now = new Date();
  const subs = await loadOneArticleSubs();
  let rows = subs.map((s) => toSubRow(s, now));

  // Filters (all read-only, applied in-memory over the small dataset).
  const f = searchParams;
  if (f.status) rows = rows.filter((r) => r.status === f.status);
  if (f.email_status) rows = rows.filter((r) => r.emailDeliveryStatus === f.email_status);
  if (f.provider) rows = rows.filter((r) => (r.provider ?? "none") === f.provider);
  if (f.override === "yes") rows = rows.filter((r) => r.adminOverride);
  if (f.override === "no") rows = rows.filter((r) => !r.adminOverride);
  if (f.suppressed === "yes") rows = rows.filter((r) => r.suppressed);
  if (f.q) {
    const needle = f.q.toLowerCase();
    rows = rows.filter((r) => r.email.toLowerCase().includes(needle));
  }

  return (
    <AdminShell
      token={token}
      title="Users"
      subtitle={`${rows.length} of ${subs.length} OneArticle subscriptions`}
      actions={<CreateUserButton token={token} />}
    >
      {/* Filter bar — a plain GET form so state lives in the URL. */}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 text-[12.5px] font-sans">
        <input type="hidden" name="token" value={token} />
        <FilterField label="Search email">
          <input
            type="text"
            name="q"
            defaultValue={f.q ?? ""}
            placeholder="email contains…"
            className="w-48 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-ink"
          />
        </FilterField>
        <FilterSelect name="status" label="Access" value={f.status} options={ACCESS_OPTIONS} />
        <FilterSelect name="email_status" label="Email" value={f.email_status} options={EMAIL_OPTIONS} />
        <FilterSelect name="provider" label="Provider" value={f.provider} options={PROVIDER_OPTIONS} />
        <FilterSelect name="override" label="Override" value={f.override} options={YESNO_OPTIONS} />
        <FilterSelect name="suppressed" label="Suppressed" value={f.suppressed} options={YESNO_OPTIONS} />
        <button
          type="submit"
          className="rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-ink hover:bg-cream"
        >
          Apply
        </button>
        <Link href={`/admin/users?${tokenQ}`} className="px-2 py-1.5 text-fog hover:text-ink">
          Reset
        </Link>
      </form>

      <AdminCard>
        <AdminTable
          head={[
            "Email",
            "Access",
            "Email",
            "Provider",
            "Plan",
            "Period ends",
            "Created",
            "Eligibility",
            "",
          ]}
          empty="No users match these filters."
          rows={rows.map((r) => [
            <span key="e" className="text-ink">
              {r.email}
              {r.adminOverride && (
                <span className="ml-1.5 text-[10px] uppercase tracking-eyebrow text-amber-700">
                  override
                </span>
              )}
            </span>,
            <StatusBadge key="s" value={r.status} />,
            <StatusBadge key="d" value={r.emailDeliveryStatus} />,
            <span key="pv" className="text-ash">{r.provider ?? "—"}</span>,
            <span key="pl" className="text-ash">{r.plan ?? "—"}</span>,
            <span key="pe" className="text-ash">{fmtDate(r.currentPeriodEnd)}</span>,
            <span key="c" className="text-ash">{fmtDate(r.createdAt)}</span>,
            <EligibilityBadge key="el" allowed={r.eligible} reason={r.reason} />,
            <Link
              key="v"
              href={`/admin/users/${r.id}?${tokenQ}`}
              className="text-ink underline underline-offset-2"
            >
              View
            </Link>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-eyebrow text-fog">{label}</span>
      {children}
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
    <FilterField label={label}>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-ink"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

const ACCESS_OPTIONS = [
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
const EMAIL_OPTIONS = ["SUBSCRIBED", "UNSUBSCRIBED", "SUPPRESSED"] as const;
const PROVIDER_OPTIONS = ["polar", "mock", "none"] as const;
const YESNO_OPTIONS = ["yes", "no"] as const;
