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
        className="rounded-full bg-admin-accent px-4 py-1.5 text-[12.5px] text-white hover:bg-admin-accent-strong"
      >
        + Add user
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-admin-ink/30 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-admin-line-strong bg-admin-surface p-5 shadow-admin-md">
            <h3 className="font-serif text-[17px] text-admin-ink">Add user</h3>
            <p className="mt-1 text-[12.5px] text-admin-body">
              Creates a OneArticle subscription in PENDING_PREFERENCES. No email is sent.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoFocus
              className="mt-3 w-full rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-[13px] text-admin-ink"
            />
            {msg && <p className="mt-2 text-[12.5px] text-dawn">{msg}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-[12.5px] text-admin-body hover:text-admin-ink" disabled={busy}>
                Cancel
              </button>
              <button type="button" onClick={submit} disabled={busy || !email.includes("@")} className="rounded-full bg-admin-accent px-4 py-1.5 text-[12.5px] text-white hover:bg-admin-accent-strong disabled:opacity-40">
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
