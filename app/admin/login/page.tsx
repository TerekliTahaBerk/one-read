import { redirect } from "next/navigation";
import {
  adminLoginConfigured,
  getAdminSession,
  sanitizeAdminNextPath,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  if (getAdminSession()) {
    redirect(sanitizeAdminNextPath(searchParams.next));
  }

  return (
    <main className="min-h-svh w-full bg-cream/30 px-5 py-10 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-sm flex-col justify-center">
        <div className="mb-8">
          <span className="font-serif italic uppercase tracking-wordmark text-[12px] text-ink/85">
            OneRead · admin
          </span>
          <h1 className="mt-4 font-serif text-3xl tracking-tight text-ink">
            Admin login
          </h1>
          <p className="mt-2 text-[13px] text-ash">Internal OneRead admin</p>
        </div>

        {adminLoginConfigured() ? (
          <AdminLoginForm next={sanitizeAdminNextPath(searchParams.next)} />
        ) : (
          <div className="rounded-lg border border-line-strong bg-paper p-4 text-[13px] text-ash">
            Configure <code className="font-mono">ADMIN_EMAIL</code>,{" "}
            <code className="font-mono">ADMIN_PASSWORD_HASH</code>, and{" "}
            <code className="font-mono">ADMIN_SESSION_SECRET</code> to enable
            admin login.
          </div>
        )}
      </div>
    </main>
  );
}
