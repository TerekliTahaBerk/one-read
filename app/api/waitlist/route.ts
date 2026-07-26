import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEmail } from "@/lib/options";

const PRODUCTS = new Set(["onegoal", "onenews", "onelingo", "onedish"]);
const LOCALES = new Set(["en", "tr", "de", "fr"]);

export async function POST(request: Request) {
  let body: { email?: unknown; product?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const email = parseEmail(body.email);
  const product = typeof body.product === "string" ? body.product.toLowerCase() : "";
  const locale = typeof body.locale === "string" && LOCALES.has(body.locale) ? body.locale : "en";
  if (!email || !PRODUCTS.has(product)) {
    return NextResponse.json({ ok: false, error: "invalid_waitlist_entry" }, { status: 400 });
  }

  await prisma.waitlistEntry.upsert({
    where: { email_product: { email, product } },
    create: { email, product, locale },
    update: { locale },
  });
  return NextResponse.json({ ok: true });
}
