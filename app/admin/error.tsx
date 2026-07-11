"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[admin] page failed", error); }, [error]);
  return (
    <main className="grid min-h-svh place-items-center bg-admin-bg px-5 font-sans text-admin-body">
      <section className="w-full max-w-lg rounded-2xl border border-admin-line bg-admin-surface p-7 shadow-admin-sm">
        <div className="mb-3 text-[11px] uppercase tracking-eyebrow text-dawn">Panel temporarily unavailable</div>
        <h1 className="font-serif text-2xl text-admin-ink">We couldn&apos;t load this page</h1>
        <p className="mt-2 text-[13px] leading-6 text-admin-body">
          The database or another required service may be temporarily unreachable. No operation was performed.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="rounded-lg bg-admin-ink px-4 py-2 text-[13px] text-white">Try again</button>
          <a href="/admin/settings" className="rounded-lg border border-admin-line-strong px-4 py-2 text-[13px] text-admin-ink">Open settings</a>
        </div>
        {error.digest && <p className="mt-4 font-mono text-[10.5px] text-admin-muted">Reference: {error.digest}</p>}
      </section>
    </main>
  );
}
