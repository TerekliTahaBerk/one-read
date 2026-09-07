import { savePreferencesRequest } from "@/lib/oneread/preferences-route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = (request: Request) => savePreferencesRequest(request, "one-news");
