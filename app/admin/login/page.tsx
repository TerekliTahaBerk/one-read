import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import {
  adminLoginConfigured,
  getAdminSession,
  sanitizeAdminNextPath,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin login — a focused, single-purpose auth screen that speaks the OneRead
 * design language: an off-white canvas, the illustrated wordmark under a small
 * "Admin" seal, a serif headline, and one calm white card. It shares the
 * neutral `admin-*` palette with the rest of the panel and pins the accent to
 * the top-level "read" (ink) theme so it reads as OneRead, not a product
 * section. Content enters with the same gentle staggered rise used elsewhere.
 */
const READ_THEME: CSSProperties = {
  "--admin-accent": "#111111",
  "--admin-accent-strong": "#000000",
  "--admin-accent-tint": "#F2F2F2",
} as CSSProperties;

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  if (getAdminSession()) {
    redirect(sanitizeAdminNextPath(searchParams.next));
  }

  const configured = adminLoginConfigured();

  return (
    <main
      style={READ_THEME}
      className="relative min-h-svh w-full overflow-hidden bg-admin-sink px-5 py-10 font-sans text-admin-body sm:px-8"
    >
      {/* Whisper of depth behind the card — kept faint to stay calm. */}
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
            Admin login
          </h1>
          <p className="mt-2.5 max-w-[30ch] text-[13.5px] leading-[1.55] text-admin-muted text-pretty">
            Sign in to the OneRead operations panel.
          </p>
        </header>

        <div className="mt-8 animate-rise-delayed">
          {configured ? (
            <div className="rounded-2xl border border-admin-line bg-admin-surface p-7 shadow-admin-md sm:p-8">
              <AdminLoginForm next={sanitizeAdminNextPath(searchParams.next)} />
            </div>
          ) : (
            <div className="rounded-2xl border border-admin-line bg-admin-surface p-7 shadow-admin-md sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-admin-line bg-admin-sink text-admin-ink">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M10 7.25v3.25M10 13.25h.008"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8.62 3.4 2.3 14.25A1.5 1.5 0 0 0 3.6 16.5h12.8a1.5 1.5 0 0 0 1.3-2.25L11.38 3.4a1.6 1.6 0 0 0-2.76 0Z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="mt-4 font-serif text-[1.15rem] font-medium tracking-[-0.01em] text-admin-ink">
                Login isn&rsquo;t configured
              </h2>
              <p className="mt-2 text-[13px] leading-[1.6] text-admin-body">
                Configure a primary admin or the additional-admin JSON list:
              </p>
              <ul className="mt-3 space-y-1.5">
                {["ADMIN_EMAIL + ADMIN_PASSWORD_HASH", "ADMIN_ADDITIONAL_ACCOUNTS", "ADMIN_SESSION_SECRET"].map(
                  (name) => (
                    <li key={name} className="flex items-center gap-2 text-[12.5px]">
                      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-admin-line-strong" />
                      <code className="rounded-md bg-admin-sink px-1.5 py-0.5 font-mono text-[12px] text-admin-ink">
                        {name}
                      </code>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
        </div>

        <footer className="mt-7 flex flex-col items-center gap-3 text-center animate-rise-delayed-2">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-admin-muted">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="3.25" y="7" width="9.5" height="6.25" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Secure area — authorized access only
          </p>
          <Link
            href="/"
            className="focus-ring link-underline rounded-sm text-[12.5px] text-admin-muted transition-colors duration-200 hover:text-admin-ink"
          >
            Back to OneRead
          </Link>
        </footer>
      </div>
    </main>
  );
}
