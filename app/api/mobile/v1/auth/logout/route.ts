import { requireMobileSession, isMobileError } from "@/lib/mobile/authenticated";
import { revokeMobileSession } from "@/lib/mobile/session";
import { mobileData } from "@/lib/mobile/response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireMobileSession(request);
  if (isMobileError(auth)) return auth;
  await revokeMobileSession(auth.id);
  return mobileData({ loggedOut: true });
}
