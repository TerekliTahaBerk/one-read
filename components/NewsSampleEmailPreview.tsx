"use client";

import { useState } from "react";

/**
 * Static OneNews sample preview. It demonstrates the FORMAT of the 5-minute
 * morning brief — concise style, sponsor-free layout, source-grounded structure
 * — using clearly generic, example-only labels. It deliberately contains no real
 * outlet names, no URLs, and no fixed fake current events, so nothing here can
 * be mistaken for real, live news.
 */
export function NewsSampleEmailPreview({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-left shadow-sm">
        <div className="text-[11px] uppercase tracking-[0.22em] text-ash">Örnek format</div>
        <h2 className="mt-3 font-serif text-[24px] leading-tight text-ink">OneNews ile bir sabah</h2>
        <p className="mt-1 font-serif text-[16px] italic text-ash">5 dakikalık gündem özeti</p>
        <p className="mt-3 text-[14px] leading-6 text-ash">
          Kısa bir sabah başlığı, kısa bir ana özet ve kaynaklara bağlı, sade bir gündem listesi. Aşağıdaki örnek yalnızca biçimi gösterir; gerçek güncel haber değildir.
        </p>
        <p className="mt-2 text-[13px] leading-6 text-fog">Sponsor bölümü yok. Gerçek kaynaklara bağlı.</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-4 rounded-full border border-[var(--theme-border)] bg-white/60 px-4 py-1.5 text-[12.5px] text-ash"
        >
          {open ? "Örneği gizle" : "Örneği gör"}
        </button>

        {open && (
          <div className="mt-5 space-y-4 border-t border-[var(--theme-border)] pt-5 text-[14px] leading-6 text-ink">
            <Section title="Sabah başlığı">
              Günün 1–2 önemli gelişmesini birleştiren kısa, yalın bir başlık. (Örnek biçim)
            </Section>
            <Section title="Kısa ana özet">
              Günün öne çıkanlarını 2–4 cümlede özetleyen, sakin bir paragraf.
            </Section>
            <Section title="Bugünün gündemi">
              Kategorilere ayrılmış, her biri tek cümlelik 5–8 madde — öncelik sırasıyla:
            </Section>
            <Bullet label="Piyasalar">Endeksler ve kurlarda günün kısa görünümü.</Bullet>
            <Bullet label="Ekonomi">Veri ya da politika başlığının tek cümlelik özeti.</Bullet>
            <Bullet label="İş dünyası">Şirket/sektör gelişmesinin kısa notu.</Bullet>
            <Bullet label="Politika">Gündemdeki kararın yalın özeti.</Bullet>
            <Bullet label="Teknoloji">Öne çıkan teknoloji gelişmesi.</Bullet>
            <Section title="Hafta sonu eki">
              Yalnızca hafta sonu ya da uygun içerik olduğunda eklenen hafif bir bölüm.
            </Section>
            <Section title="Kaynaklar">
              Her madde gerçek kaynağına bağlanır. OneNews haberi uydurmaz.
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] uppercase tracking-[0.1em] text-[var(--theme-accent)]">{title}</div>
      <p className="mt-1 text-ash">{children}</p>
    </div>
  );
}

function Bullet({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pl-3">
      <span className="text-[12.5px] font-medium text-ink">{label}.</span>{" "}
      <span className="text-[13.5px] text-ash">{children}</span>
    </div>
  );
}
