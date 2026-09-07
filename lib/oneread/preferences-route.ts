import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { parseProductPreferences } from "@/lib/product-preferences";
import { prisma } from "@/lib/prisma";
import { hasVerifiedEmail } from "./verification";
import { checkoutIntent } from "@/lib/billing/checkout-intent";
import { parseOfferSelection, OFFERS, type ProductKey } from "@/lib/products/registry";
import { resolveProductEntitlement } from "@/lib/products/entitlements";
import { saveProductPreferences } from "./product-preferences";

export async function savePreferencesRequest(request: Request, product: ProductKey) {
  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 }); }
  if (!payload || typeof payload !== "object") return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  const email = parseEmail(payload.email);
  if (!email) return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  if (!hasVerifiedEmail(email)) return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  const value = parseProductPreferences(payload);
  if (!value) return NextResponse.json({ ok: false, error: "invalid_product_preferences" }, { status: 400 });
  try {
    // Signup requires the same offer/interval-bound proof as checkout. Account
    // editing requires current entitlement and an email-ownership session.
    if (payload.context === "signup") {
      const selection = parseOfferSelection(payload.offer, payload.interval);
      if (!selection || !OFFERS[selection.offer].grants.includes(product)) return NextResponse.json({ ok: false, error: "product_not_in_offer" }, { status: 400 });
      if (!hasVerifiedEmail(email, checkoutIntent(selection.offer, selection.interval))) return NextResponse.json({ ok: false, error: "verification_intent_mismatch" }, { status: 409 });
      const contact = await prisma.contact.upsert({ where: { email }, update: {}, create: { email } });
      await saveProductPreferences(contact.id, product, value);
    } else {
      const contact = await prisma.contact.findUnique({ where: { email }, include: { subscriptions: true } });
      if (!contact || !resolveProductEntitlement(contact.subscriptions, product).granted) return NextResponse.json({ ok: false, error: "product_access_required" }, { status: 403 });
      await saveProductPreferences(contact.id, product, value);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[product-preferences] save failed", error);
    return NextResponse.json({ ok: false, error: "preferences_save_failed" }, { status: 500 });
  }
}
