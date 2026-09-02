import { authenticateMobileRequest } from "@/lib/mobile/session";
import { mobileError } from "@/lib/mobile/response";
import { resolveTodayForContact } from "@/lib/mobile/today";

export async function requireMobileSession(request: Request) {
  const session = await authenticateMobileRequest(request);
  return session ?? mobileError("UNAUTHENTICATED", 401, "Sign in again to continue.");
}

export function isMobileError(value: unknown): value is Response {
  return value instanceof Response;
}

export async function requireMobileReaderAccess(contactId: string) {
  const today = await resolveTodayForContact(contactId);
  if (today.state === "ACCOUNT_INCOMPLETE") {
    return mobileError("ACCOUNT_INCOMPLETE", 403, "Complete your reading preferences to continue.");
  }
  if (today.state === "SUBSCRIPTION_REQUIRED") {
    return mobileError("SUBSCRIPTION_REQUIRED", 403, "An active OneRead subscription is required.");
  }
  return null;
}
