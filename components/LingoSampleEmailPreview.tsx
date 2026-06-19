"use client";

export function LingoSampleEmailPreview({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full rounded-2xl border border-[var(--theme-border)] bg-white/60 p-5 text-left shadow-sm ${className}`}
      aria-label="Static OneLingo sample email"
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-ash">Sample email</div>
      <h2 className="mt-3 font-serif text-[24px] leading-tight text-ink">
        Ordering coffee in Spanish
      </h2>
      <p className="mt-3 text-[14px] leading-6 text-ash">
        Prepared for your Spanish practice at Intermediate level.
      </p>
      <div className="mt-5 space-y-4 text-[14px] leading-6 text-ink">
        <p>
          <strong>Useful words:</strong> cafe, agua, cuenta, por favor.
        </p>
        <p>
          <strong>Phrase:</strong> Quisiera un cafe, por favor.
        </p>
        <p>
          <strong>Mini practice:</strong> Translate: “I would like water,
          please.”
        </p>
        <p className="text-ash">
          <strong>Answer key:</strong> Quisiera agua, por favor.
        </p>
      </div>
    </div>
  );
}
