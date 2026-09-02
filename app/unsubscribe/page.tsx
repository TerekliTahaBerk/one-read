import { cookies } from "next/headers";
import Link from "next/link";
import { normalizeSiteLocale, SITE_DICTIONARIES, SITE_LOCALE_COOKIE } from "@/lib/site-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET is deliberately render-only: scanners and previews can never suppress mail. */
export default async function UnsubscribePage(props: {
  searchParams: Promise<{ send?: string; email?: string; subscription?: string; preview?: string; result?: string }>;
}) {
  const params = await props.searchParams;
  const locale = normalizeSiteLocale((await cookies()).get(SITE_LOCALE_COOKIE)?.value);
  const t = SITE_DICTIONARIES[locale].unsubscribe;
  const preview = params.preview === "1";
  const done = params.result === "done";
  const message = preview ? t.preview : done ? t.doneGeneric : {
    headline: "Unsubscribe from OneRead?",
    body: "Confirm below to stop OneRead emails. Your paid plan and billing will not be changed.",
  };

  return <main style={{ margin: 0, background: "#F6F1E6", color: "#1B1612", fontFamily: "ui-sans-serif, system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 24 }}>
    <div style={{ maxWidth: 460, textAlign: "center" }}>
      <div style={{ fontFamily: "ui-serif, Georgia, Cambria, serif", fontStyle: "italic", textTransform: "uppercase", letterSpacing: "0.22em", fontSize: 12.5, marginBottom: 32 }}>OneRead</div>
      <h1 style={{ fontFamily: "ui-serif, Georgia, Cambria, serif", fontWeight: 500, fontSize: 28, lineHeight: 1.15, margin: "0 0 14px" }}>{message.headline}</h1>
      <p style={{ color: "#6B5F50", fontSize: 14, lineHeight: 1.65 }}>{message.body}</p>
      {!preview && !done && <form action="/api/unsubscribe/human" method="post" style={{ marginTop: 24 }}>
        {params.subscription && <input type="hidden" name="subscription" value={params.subscription} />}
        {params.send && <input type="hidden" name="send" value={params.send} />}
        {params.email && <input type="hidden" name="email" value={params.email} />}
        <button type="submit" style={{ border: 0, borderRadius: 8, background: "#1B1612", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, padding: "12px 20px" }}>Unsubscribe</button>
      </form>}
      {!preview && <div style={{ marginTop: 24, padding: 18, border: "1px solid rgba(107,95,80,.2)", borderRadius: 10 }}><p style={{ color: "#6B5F50", fontSize: 13 }}>Email unsubscribe does not cancel or change your paid plan.</p><Link href="/subscribe" style={{ color: "#1B1612", fontSize: 13, fontWeight: 600 }}>Manage billing</Link></div>}
      <div style={{ marginTop: 32, fontFamily: "ui-serif, Georgia, Cambria, serif", fontStyle: "italic", color: "#9C8F7E", fontSize: 13 }}>{t.tagline}</div>
    </div>
  </main>;
}
