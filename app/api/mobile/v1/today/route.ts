import { requireMobileSession, isMobileError } from "@/lib/mobile/authenticated";
import { mobileData } from "@/lib/mobile/response";
import { resolveTodayForContact } from "@/lib/mobile/today";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireMobileSession(request);
  if (isMobileError(auth)) return auth;
  return mobileData(await resolveTodayForContact(auth.contactId));
}
