import { NextResponse, type NextRequest } from "next/server";

const NO_INDEX_PREFIXES = [
  "/admin",
  "/api",
  "/subscribe",
  "/preferences",
  "/unsubscribe",
  "/waitlist",
];

const CANONICAL_PREFIXES = [
  "/article",
  "/film",
  "/pricing",
  "/blog",
  "/terms",
  "/privacy",
  "/editorial",
  "/samples",
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  if (NO_INDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else if (
    pathname === "/" ||
    CANONICAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    const base = process.env.PUBLIC_BASE_URL?.trim() || "https://oneread.email";
    response.headers.set(
      "Link",
      `<${new URL(pathname, base).toString()}>; rel="canonical"`,
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
