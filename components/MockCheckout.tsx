"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PRICING, type BillingInterval } from "@/lib/options";

/**
 * Development-only mock checkout. Collects NO card data and processes NO real
 * payment — it just calls the mock-complete endpoint to flip the subscription
 * to ACTIVE_PAID, then returns to the subscribe lookup.
 */
export function MockCheckout({ email, plan }: { email: string; plan: BillingInterval }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = plan === "annual" ? `$${PRICING.annual} / year` : `$${PRICING.monthly} / month`;

  async function complete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.push(`/article/subscribe?email=${encodeURIComponent(email)}`);
      } else {
        setError(data.error ?? "Could not complete mock payment.");
      }
    } catch {
      setError("Could not complete mock payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[30rem] mx-auto mt-8 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-7">
      <p className="font-sans text-[11px] uppercase tracking-eyebrow text-amber-700">
        Development mock checkout
      </p>
      <p className="font-sans text-[13px] text-ash mt-3">
        No card is collected and no real payment is made. This only simulates a
        completed subscription for testing.
      </p>

      <dl className="mt-5 space-y-2 font-sans text-[14px]">
        <div className="flex justify-between">
          <dt className="text-ash">Email</dt>
          <dd className="text-ink">{email}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ash">Plan</dt>
          <dd className="text-ink capitalize">{plan}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ash">Price</dt>
          <dd className="text-ink">{price}</dd>
        </div>
      </dl>

      {error ? <p className="font-sans text-[13px] text-red-600 mt-4">{error}</p> : null}

      <button
        onClick={complete}
        disabled={loading}
        className="mt-6 w-full rounded-xl px-5 py-3 font-sans text-[15px] font-medium bg-[var(--theme-accent)] text-white disabled:opacity-40"
      >
        {loading ? "Completing…" : "Complete mock payment"}
      </button>
    </div>
  );
}
