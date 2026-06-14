import { redirect } from "next/navigation";
import { ManualArticleForm } from "@/components/ManualArticleForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin/manual-article?token=<ADMIN_TOKEN>
 *
 * Admin-only form to add a candidate article by hand. Useful for testing
 * editorial quality before real RSS/LLM providers are configured.
 */
export default function ManualArticlePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    return (
      <Shell>
        <p className="text-ash text-sm">
          Set <code>ADMIN_TOKEN</code> in your environment to enable admin tools.
        </p>
      </Shell>
    );
  }
  if (token !== expected) {
    redirect("/");
  }

  return (
    <Shell>
      <div className="mb-6">
        <a
          href={`/admin?token=${encodeURIComponent(token)}`}
          className="text-[12px] text-fog hover:text-ink font-sans"
        >
          ← Back to admin
        </a>
        <h1 className="font-serif text-2xl tracking-tight text-ink mt-3">
          Add an article manually
        </h1>
        <p className="text-[13.5px] text-ash font-sans mt-2 max-w-2xl">
          Saved as <code>PENDING</code> and deduped by URL. Run{" "}
          <code>npm run score</code> (or the daily pipeline) to score and
          summarize it. The scorer trusts the body you paste here and skips the
          network fetch.
        </p>
      </div>
      <ManualArticleForm token={token} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-svh w-full px-5 sm:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 text-center">
          <span className="font-serif italic uppercase tracking-wordmark text-[12px] text-ink/85">
            One&nbsp;·&nbsp;Read · admin
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}
