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
  const issues = await accessibleIssueList(auth.contactId, 12, 0, new Date(), { exploreOnly: true });
  return mobileData({
    sections: [
      { id: "editor-picks", title: "Editor picks", subtitle: "A finite shelf, ordered from the panel", items: issues.slice(0, 4) },
      { id: "from-the-archive", title: "From the archive", subtitle: "More useful editions", items: issues.slice(4, 8) },
    ].filter((section) => section.items.length > 0),
  });
}
