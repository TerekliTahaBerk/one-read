"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function OperatorQueueAction(props: { product: string; deliveryId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  async function retry() {
    if (!confirm("Retry this confirmed hard failure? Eligibility and state will be checked again.")) return;
    setState("busy");
    const response = await fetch("/api/admin/operator-queue/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "retry-delivery", ...props }) });
    if (response.ok) { router.refresh(); return; }
    setState("error");
  }
  return <button type="button" disabled={state === "busy"} onClick={retry} className="rounded-full border border-admin-line-strong px-3 py-1 text-[11px] disabled:opacity-50">
    {state === "busy" ? "Checking…" : state === "error" ? "Refused — refresh" : "Retry safely"}
  </button>;
}
