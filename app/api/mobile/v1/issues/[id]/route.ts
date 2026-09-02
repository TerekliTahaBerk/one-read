import { requireMobileReaderAccess, requireMobileSession, isMobileError } from "@/lib/mobile/authenticated";
import { accessibleIssue } from "@/lib/mobile/issues";
import { mobileData, mobileError } from "@/lib/mobile/response";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileSession(request);
  if (isMobileError(auth)) return auth;
  const access = await requireMobileReaderAccess(auth.contactId);
  if (access) return access;
  const { id } = await params;
  const issue = await accessibleIssue(auth.contactId, id);
  return issue ? mobileData(issue) : mobileError("NOT_FOUND", 404, "This issue is not available.");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileSession(request);
  if (isMobileError(auth)) return auth;
  const access = await requireMobileReaderAccess(auth.contactId);
  if (access) return access;
  const { id } = await params;
  if (!(await accessibleIssue(auth.contactId, id))) {
    return mobileError("NOT_FOUND", 404, "This issue is not available.");
  }
  let body: { progress?: unknown };
  try { body = (await request.json()) as typeof body; } catch {
    return mobileError("INVALID_REQUEST", 400, "Progress must be a whole percentage.");
  }
  const progress = typeof body.progress === "number" ? Math.round(body.progress) : NaN;
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    return mobileError("INVALID_REQUEST", 400, "Progress must be between 0 and 100.");
  }
  const reading = await prisma.readingState.upsert({
    where: { contactId_issueId: { contactId: auth.contactId, issueId: id } },
    update: { progress, ...(progress >= 92 ? { completedAt: new Date() } : {}) },
    create: { contactId: auth.contactId, issueId: id, progress, completedAt: progress >= 92 ? new Date() : null },
  });
  return mobileData({ progress: reading.progress, completed: Boolean(reading.completedAt) });
}
