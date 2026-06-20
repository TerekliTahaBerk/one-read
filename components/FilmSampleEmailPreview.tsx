"use client";

import { useState } from "react";

/**
 * Static OneFilm sample preview. It demonstrates the FORMAT of the film note —
 * short, tasteful, spoiler-light editorial style — using clearly generic,
 * example-only labels. It deliberately contains no real film titles, no
 * director/year, no platform/availability claims, and no ratings, so nothing
 * here can be mistaken for a real current recommendation.
 */
export function FilmSampleEmailPreview({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-left shadow-sm">
        <div className="text-[11px] uppercase tracking-[0.22em] text-ash">Örnek format</div>
        <h2 className="mt-3 font-serif text-[24px] leading-tight text-ink">OneFilm’den bir not</h2>
        <p className="mt-1 font-serif text-[16px] italic text-ash">Uzun bir akşam için sakin bir film</p>
        <p className="mt-3 text-[14px] leading-6 text-ash">
          Tek bir film, neden izlemeye değer olduğuna dair kısa bir not, hangi ruh hâline iyi geleceği ve başlamadan önce bilmen gerekenler. Aşağıdaki örnek yalnızca biçimi gösterir; gerçek bir film önerisi değildir.
        </p>
        <p className="mt-2 text-[13px] leading-6 text-fog">Liste yok, gürültü yok. Metadata dışı bilgi uydurmaz.</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-4 rounded-full border border-[var(--theme-border)] bg-white/60 px-4 py-1.5 text-[12.5px] text-ash"
        >
          {open ? "Örneği gizle" : "Örneği gör"}
        </button>

        {open && (
          <div className="mt-5 space-y-4 border-t border-[var(--theme-border)] pt-5 text-[14px] leading-6 text-ink">
            <Section title="Film notu">
              Filmi neden bu akşam açmaya değer kıldığına dair kısa, özgün bir not — bir eleştiriden kopyalanmaz.
            </Section>
            <Section title="Neden bu film?">
              Ruh hâline ve ana fikre dayanan, genel geçer olmayan, kısa ve net bir sebep.
            </Section>
            <Section title="Nasıl hissettiriyor?">
              Filmin tonu ve dokusu — sakin, gergin, sıcak, ağır ilerleyen — neye hazırlandığını bilesin diye.
            </Section>
            <Section title="Ne zaman iyi gider?">
              Doğru an için kısa bir öneri — uzun bir günün ardından, telefonu kenara koyabileceğin bir akşamda.
            </Section>
            <Section title="Başlamadan önce">
              Spoiler içermeyen bir hatırlatma. OneFilm, sen istemedikçe sürprizleri açık etmez.
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
