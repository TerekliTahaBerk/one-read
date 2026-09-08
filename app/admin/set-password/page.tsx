import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { peekAdminInvite } from "@/lib/admin/auth";
import { SetPasswordForm } from "@/components/admin/SetPasswordForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin/set-password?token=… — where an invited administrator activates their
 * account by choosing a password.
 *
 * Unauthenticated by design: the invitee has no account to sign in with yet.
 * The token is the whole authorisation, so the page reveals nothing without a
 * valid one — an expired or unknown token gets the same neutral message
 * whether or not the account exists.
 */
const READ_THEME: CSSProperties = {
  "--admin-accent": "#111111",
  "--admin-accent-strong": "#000000",
  "--admin-accent-tint": "#F2F2F2",
} as CSSProperties;

export default async function AdminSetPasswordPage(props: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  const email = token ? await peekAdminInvite(token) : null;

  return (
    <main
      style={READ_THEME}
      className="relative min-h-svh w-full overflow-hidden bg-admin-sink px-5 py-10 font-sans text-admin-body sm:px-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[radial-gradient(58%_100%_at_50%_0%,rgba(17,17,17,0.05),transparent_72%)]"
      />

      <div className="relative mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-[25rem] flex-col justify-center">
        <header className="flex flex-col items-center text-center animate-rise">
          <Link
            href="/"
            aria-label="OneRead — home"
            className="focus-ring inline-flex items-center gap-2.5 rounded-full px-1 py-1"
          >
            <Image
              src="/oneread-logo.png"
              alt="OneRead"
              width={1057}
              height={250}
              priority
              className="h-[26px] w-auto select-none"
            />
            <span className="rounded-full border border-admin-line-strong px-2 py-0.5 text-[9.5px] uppercase tracking-eyebrow text-admin-muted">
              Admin
            </span>
          </Link>

          <h1 className="mt-7 font-serif text-[2rem] font-medium leading-[1.05] tracking-[-0.02em] text-admin-ink">
            {email ? "Choose your password" : "Setup link not valid"}
          </h1>
          <p className="mt-2.5 max-w-[32ch] text-[13.5px] leading-[1.55] text-admin-muted text-pretty">
            {email
              ? "You are activating your OneRead admin account. Only you will know this password."
              : "This setup link has expired or has already been used."}
          </p>
        </header>

        <div className="mt-8 animate-rise-delayed">
          <div className="rounded-2xl border border-admin-line bg-admin-surface p-7 shadow-admin-md sm:p-8">
            {email ? (
              <SetPasswordForm token={token} email={email} />
            ) : (
              <p className="text-[13px] leading-[1.6] text-admin-body">
                Ask an administrator to send you a new invitation from{" "}
                <span className="text-admin-ink">Settings → Panel administrators</span>.
              </p>
            )}
          </div>
        </div>

        <footer className="mt-7 flex justify-center text-center animate-rise-delayed-2">
          <Link href="/admin/login" className="text-[12.5px] text-admin-muted hover:text-admin-ink">
            Back to admin login
          </Link>
        </footer>
      </div>
    </main>
  );
}
