import { requireMobileReaderAccess, requireMobileSession, isMobileError } from "@/lib/mobile/authenticated";
import { accessibleIssueList } from "@/lib/mobile/issues";
import { mobileData } from "@/lib/mobile/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireMobileSession(request);
  if (isMobileError(auth)) return auth;
  const access = await requireMobileReaderAccess(auth.contactId);
  if (access) return access;
  const url = new URL(request.url);
  const page = Math.max(1, Math.min(50, Number(url.searchParams.get("page")) || 1));
  const pageSize = 20;
  const items = await accessibleIssueList(auth.contactId, pageSize + 1, (page - 1) * pageSize);
  return mobileData({ items: items.slice(0, pageSize), page, hasMore: items.length > pageSize });
}
