"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Adds a OneArticle contact + subscription by email (PENDING_PREFERENCES). */
export function CreateUserButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/users/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create-user", email }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok || !json.ok) {
      setMsg(`Error: ${json.error ?? "failed"}`);
      return;
    }
    setOpen(false);
    setEmail("");
    if (json.subId) router.push(`/admin/users/${json.subId}`);
    else router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-[12.5px] text-ink hover:bg-cream"
      >
        + Add user
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-line-strong bg-paper p-5 shadow-lg">
            <h3 className="font-serif text-[17px] text-ink">Add user</h3>
            <p className="mt-1 text-[12.5px] text-ash">
              Creates a OneArticle subscription in PENDING_PREFERENCES. No email is sent.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoFocus
              className="mt-3 w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-ink"
            />
            {msg && <p className="mt-2 text-[12.5px] text-dawn">{msg}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-[12.5px] text-ash hover:text-ink" disabled={busy}>
                Cancel
              </button>
              <button type="button" onClick={submit} disabled={busy || !email.includes("@")} className="rounded-lg border border-line-strong px-3 py-1.5 text-[12.5px] text-ink hover:bg-cream disabled:opacity-40">
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
