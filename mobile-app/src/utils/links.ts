export type InternalDestination = "/(tabs)" | "/(tabs)/library" | "/settings" | { pathname: "/article/[id]"; params: { id: string } };

export function internalDestination(url: string): InternalDestination | null {
  try {
    const parsed = new URL(url);
    const allowed = parsed.protocol === "oneread:" || (parsed.hostname === "www.oneread.email" && parsed.protocol === "https:");
    if (!allowed) return null;
    const path = parsed.protocol === "oneread:" ? `/${parsed.hostname}${parsed.pathname}`.replace(/\/$/, "") : parsed.pathname.replace(/\/$/, "");
    if (path === "/today" || path === "") return "/(tabs)";
    if (path === "/library") return "/(tabs)/library";
    if (path === "/settings") return "/settings";
    const match = /^\/article\/([A-Za-z0-9_-]{1,120})$/.exec(path);
    return match ? { pathname: "/article/[id]", params: { id: match[1]! } } : null;
  } catch { return null; }
}
