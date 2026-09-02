"use client";

import { MOBILE_TOPICS } from "@/lib/one-article/editorial-validation";

export type NativeBlock =
  | { type: "paragraph" | "heading" | "sourceNote"; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "callout"; text: string; title?: string }
  | { type: "divider" }
  | { type: "image"; url: string; alt: string; credit?: string };

export type MobileEditorialValue = {
  mobileEnabled: boolean;
  mobileExploreEnabled: boolean;
  mobileListenEnabled: boolean;
  mobileTopics: string[];
  mobilePriority: number;
  mobileDeck: string;
  mobileAudioUrl: string;
  mobileAudioDurationSeconds: number | null;
  nativeContent: NativeBlock[];
};

type Props = {
  value: MobileEditorialValue;
  bodyText: string;
  disabled: boolean;
  onChange: <K extends keyof MobileEditorialValue>(key: K, value: MobileEditorialValue[K]) => void;
};

export function MobileContentControls({ value, bodyText, disabled, onChange }: Props) {
  const setBlock = (index: number, block: NativeBlock) => {
    onChange("nativeContent", value.nativeContent.map((item, itemIndex) => itemIndex === index ? block : item));
  };
  const addBlock = (type: NativeBlock["type"]) => {
    const block: NativeBlock = type === "divider"
      ? { type }
      : type === "image"
        ? { type, url: "", alt: "" }
        : { type, text: "" };
    onChange("nativeContent", [...value.nativeContent, block]);
  };
  const syncFromBody = () => {
    const blocks: NativeBlock[] = bodyText
      .split(/\n\s*\n/u)
      .map((text) => text.replace(/\s+/gu, " ").trim())
      .filter(Boolean)
      .map((text) => ({ type: "paragraph", text }));
    onChange("nativeContent", blocks);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <ToggleCard label="Mobile app" detail="Published editions can appear in the app." checked={value.mobileEnabled} disabled={disabled} onChange={(checked) => onChange("mobileEnabled", checked)} />
        <ToggleCard label="Explore shelf" detail="Include this edition in curated discovery." checked={value.mobileExploreEnabled} disabled={disabled || !value.mobileEnabled} onChange={(checked) => onChange("mobileExploreEnabled", checked)} />
        <ToggleCard label="Listen" detail="Allow narration or a mastered audio file." checked={value.mobileListenEnabled} disabled={disabled || !value.mobileEnabled} onChange={(checked) => onChange("mobileListenEnabled", checked)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <label className="block">
          <span className={labelClass}>Mobile deck override</span>
          <textarea className={`${inputClass} min-h-24 resize-y`} maxLength={320} value={value.mobileDeck} placeholder="Blank uses the email preview text." disabled={disabled} onChange={(event) => onChange("mobileDeck", event.target.value)} />
          <span className={helpClass}>{value.mobileDeck.length}/320 · optional</span>
        </label>
        <label className="block">
          <span className={labelClass}>Explore priority</span>
          <input className={inputClass} type="number" min={0} max={999} value={value.mobilePriority} disabled={disabled} onChange={(event) => onChange("mobilePriority", Number(event.target.value))} />
          <span className={helpClass}>Higher appears first.</span>
        </label>
      </div>

      <fieldset disabled={disabled}>
        <legend className={labelClass}>Topics</legend>
        <div className="flex flex-wrap gap-2">
          {MOBILE_TOPICS.map((topic) => {
            const active = value.mobileTopics.includes(topic);
            return <button key={topic} type="button" aria-pressed={active} onClick={() => onChange("mobileTopics", active ? value.mobileTopics.filter((item) => item !== topic) : [...value.mobileTopics, topic])} className={`rounded-full border px-3 py-2 text-[12px] transition ${active ? "border-admin-accent bg-admin-accent text-white" : "border-admin-line-strong bg-admin-bg text-admin-body hover:border-admin-accent"}`}>{topic}</button>;
          })}
        </div>
        <span className={helpClass}>No selection uses the automatic topic fallback for older editions.</span>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
        <label className="block">
          <span className={labelClass}>Mastered audio URL</span>
          <input className={inputClass} type="url" value={value.mobileAudioUrl} placeholder="https://…/edition.mp3" disabled={disabled || !value.mobileListenEnabled} onChange={(event) => onChange("mobileAudioUrl", event.target.value)} />
          <span className={helpClass}>Optional HTTPS file. Blank uses device narration.</span>
        </label>
        <label className="block">
          <span className={labelClass}>Duration (seconds)</span>
          <input className={inputClass} type="number" min={1} value={value.mobileAudioDurationSeconds ?? ""} disabled={disabled || !value.mobileListenEnabled} onChange={(event) => onChange("mobileAudioDurationSeconds", event.target.value ? Number(event.target.value) : null)} />
        </label>
      </div>

      <div className="border-t border-admin-line pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-medium text-admin-ink">Native reading blocks</h3>
            <p className="mt-1 max-w-2xl text-[11.5px] leading-5 text-admin-muted">Build the rich mobile article. If empty, the app safely converts the email body into paragraphs.</p>
          </div>
          <button type="button" disabled={disabled || !bodyText.trim()} onClick={syncFromBody} className={quietButton}>Sync from article text</button>
        </div>
        <div className="mt-4 space-y-3">
          {value.nativeContent.map((block, index) => (
            <BlockRow key={`${block.type}-${index}`} block={block} index={index} total={value.nativeContent.length} disabled={disabled} onChange={(next) => setBlock(index, next)} onMove={(offset) => {
              const next = [...value.nativeContent];
              const target = index + offset;
              if (target < 0 || target >= next.length) return;
              [next[index], next[target]] = [next[target], next[index]];
              onChange("nativeContent", next);
            }} onDelete={() => onChange("nativeContent", value.nativeContent.filter((_, itemIndex) => itemIndex !== index))} />
          ))}
          {value.nativeContent.length === 0 ? <div className="rounded-lg border border-dashed border-admin-line-strong bg-admin-bg px-4 py-6 text-center text-[12px] text-admin-muted">No custom blocks. The mobile reader will use clean paragraphs from the article body.</div> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["paragraph", "heading", "quote", "callout", "image", "divider", "sourceNote"] as NativeBlock["type"][]).map((type) => <button key={type} type="button" disabled={disabled} onClick={() => addBlock(type)} className={quietButton}>+ {blockLabel(type)}</button>)}
        </div>
      </div>
    </div>
  );
}

function ToggleCard({ label, detail, checked, disabled, onChange }: { label: string; detail: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`flex min-h-24 cursor-pointer gap-3 rounded-xl border p-3 transition ${checked ? "border-admin-accent bg-admin-accent-tint" : "border-admin-line bg-admin-bg"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}><input type="checkbox" className="mt-0.5 h-4 w-4 accent-admin-accent" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><span><span className="block text-[12.5px] font-medium text-admin-ink">{label}</span><span className="mt-1 block text-[11px] leading-4 text-admin-muted">{detail}</span></span></label>;
}

function BlockRow({ block, index, total, disabled, onChange, onMove, onDelete }: { block: NativeBlock; index: number; total: number; disabled: boolean; onChange: (block: NativeBlock) => void; onMove: (offset: number) => void; onDelete: () => void }) {
  return <div className="rounded-xl border border-admin-line bg-admin-bg p-3"><div className="mb-3 flex items-center justify-between gap-3"><span className="text-[11px] font-medium uppercase tracking-eyebrow text-admin-muted">{index + 1}. {blockLabel(block.type)}</span><div className="flex gap-1"><button type="button" aria-label="Move block up" disabled={disabled || index === 0} onClick={() => onMove(-1)} className={iconButton}>↑</button><button type="button" aria-label="Move block down" disabled={disabled || index === total - 1} onClick={() => onMove(1)} className={iconButton}>↓</button><button type="button" aria-label="Delete block" disabled={disabled} onClick={onDelete} className={`${iconButton} text-rose-700`}>×</button></div></div>{block.type === "divider" ? <div className="h-px bg-admin-line" /> : block.type === "image" ? <div className="grid gap-2 sm:grid-cols-2"><input className={inputClass} type="url" placeholder="HTTPS image URL" value={block.url} disabled={disabled} onChange={(event) => onChange({ ...block, url: event.target.value })} /><input className={inputClass} placeholder="Alternative text" value={block.alt} disabled={disabled} onChange={(event) => onChange({ ...block, alt: event.target.value })} /><input className={`${inputClass} sm:col-span-2`} placeholder="Image credit (optional)" value={block.credit ?? ""} disabled={disabled} onChange={(event) => onChange({ ...block, credit: event.target.value })} /></div> : <div className="space-y-2">{block.type === "callout" ? <input className={inputClass} placeholder="Callout title (optional)" value={block.title ?? ""} disabled={disabled} onChange={(event) => onChange({ ...block, title: event.target.value })} /> : null}<textarea className={`${inputClass} min-h-24 resize-y`} placeholder={`${blockLabel(block.type)} text`} value={block.text} disabled={disabled} onChange={(event) => onChange({ ...block, text: event.target.value })} />{block.type === "quote" ? <input className={inputClass} placeholder="Attribution (optional)" value={block.attribution ?? ""} disabled={disabled} onChange={(event) => onChange({ ...block, attribution: event.target.value })} /> : null}</div>}</div>;
}

export function MobilePreviewPanel({ headline, deck, imageUrl, value }: { headline: string; deck: string; imageUrl: string; value: MobileEditorialValue }) {
  const effectiveDeck = value.mobileDeck || deck;
  return <aside className="sticky top-5 self-start rounded-xl border border-admin-line bg-admin-surface p-4"><div className="mb-3 flex items-center justify-between"><div><div className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Live preview</div><div className="mt-1 text-[13px] font-medium text-admin-ink">Mobile app</div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${value.mobileEnabled ? "bg-emerald-50 text-emerald-700" : "bg-admin-sink text-admin-muted"}`}>{value.mobileEnabled ? "Visible" : "Hidden"}</span></div><div className="mx-auto max-w-[350px] overflow-hidden rounded-[32px] border-[7px] border-slate-950 bg-[#f6f3ed] shadow-xl"><div className="flex h-8 items-center justify-between bg-[#f6f3ed] px-5 text-[9px] font-semibold text-slate-900"><span>9:41</span><span>● ◔ ▰</span></div><div className="px-5 pb-7 pt-3"><div className="font-serif text-[25px] font-semibold text-slate-950">OneRead</div><div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">{imageUrl ? <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(imageUrl).slice(1, -1)})` }} /> : <div className="grid h-40 place-items-center bg-[#e9e2d5] font-serif text-4xl text-slate-800">O</div>}<div className="p-5"><div className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#ff5a3d]">OneArticle · {value.mobileTopics.join(" · ") || "Ideas"}</div><div className="mt-2 font-serif text-[24px] font-semibold leading-[1.08] text-slate-950">{headline || "Your mobile headline"}</div>{effectiveDeck ? <div className="mt-3 text-[11px] leading-4 text-slate-600">{effectiveDeck}</div> : null}<div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-[9px] text-slate-500"><span>{value.nativeContent.length || "Auto"} blocks</span><span>{value.mobileListenEnabled ? value.mobileAudioUrl ? "Mastered audio" : "Device narration" : "Listen off"}</span></div></div></div></div></div></aside>;
}

function blockLabel(type: NativeBlock["type"]) {
  return ({ paragraph: "Paragraph", heading: "Heading", quote: "Quote", callout: "Callout", divider: "Divider", image: "Image", sourceNote: "Source note" } as const)[type];
}

const labelClass = "mb-1.5 block text-[11px] uppercase tracking-eyebrow text-admin-muted";
const helpClass = "mt-1 block text-[11px] leading-4 text-admin-muted";
const inputClass = "block w-full rounded-lg border border-admin-line bg-admin-bg px-3 py-2.5 text-[13px] text-admin-ink outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-admin-accent-tint disabled:cursor-not-allowed disabled:opacity-60";
const quietButton = "rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-[11.5px] text-admin-body transition hover:bg-admin-sink disabled:cursor-not-allowed disabled:opacity-40";
const iconButton = "grid h-7 w-7 place-items-center rounded-md border border-admin-line bg-admin-surface text-[12px] text-admin-body disabled:opacity-30";
