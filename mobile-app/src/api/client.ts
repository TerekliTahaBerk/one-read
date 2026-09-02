import Constants from "expo-constants";
import { fixtureArchive, fixtureToday, todayArticle } from "./fixtures";
import type { Article, Today } from "@/types/article";
import type { z } from "zod";
import { articleSchema, exploreSchema, librarySchema, todaySchema } from "./schemas";

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
const origin = (Constants.expoConfig?.extra?.apiOrigin as string | undefined)?.replace(/\/$/, "") ?? "https://www.oneread.email";
export const useFixtures = process.env.EXPO_PUBLIC_USE_FIXTURES !== "false";

async function request<T>(path: string, token?: string, init?: RequestInit, schema?: z.ZodType<T>): Promise<T> {
  const response = await fetch(`${origin}/api/mobile/v1${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || !body.ok) throw new Error(body.ok ? "Request failed" : body.error.message);
  return schema ? schema.parse(body.data) : body.data;
}

export const api = {
  requestCode: async (email: string) => useFixtures ? { cooldownSeconds: 60 } : request<{ cooldownSeconds: number }>("/auth/request-code", undefined, { method: "POST", body: JSON.stringify({ email }) }),
  verifyCode: async (email: string, code: string) => useFixtures ? { token: "fixture-token", expiresAt: "2099-01-01T00:00:00.000Z" } : request<{ token: string; expiresAt: string }>("/auth/verify-code", undefined, { method: "POST", body: JSON.stringify({ email, code, deviceLabel: "OneRead iOS" }) }),
  today: async (token: string): Promise<Today> => useFixtures ? fixtureToday : request("/today", token, undefined, todaySchema),
  issue: async (token: string, id: string): Promise<Article> => useFixtures ? (fixtureArchive.find((item) => item.id === id) ?? todayArticle) : request(`/issues/${encodeURIComponent(id)}`, token, undefined, articleSchema),
  explore: async (token: string) => useFixtures ? { sections: [{ id: "recent", title: "A little more", subtitle: "Four useful editions. Then, an end.", items: fixtureArchive.slice(1, 5) }] } : request<{ sections: { id: string; title: string; subtitle: string; items: Article[] }[] }>("/explore", token, undefined, exploreSchema),
  library: async (token: string) => useFixtures ? { items: fixtureArchive, page: 1, hasMore: false } : request<{ items: Article[]; page: number; hasMore: boolean }>("/library", token, undefined, librarySchema),
  logout: async (token: string) => useFixtures ? undefined : request("/auth/logout", token, { method: "POST" }),
  updateProgress: async (token: string, id: string, progress: number) => useFixtures ? undefined : request(`/issues/${encodeURIComponent(id)}`, token, { method: "PATCH", body: JSON.stringify({ progress }) }),
  me: async (token: string) => useFixtures ? { account: { email: "reader@example.com" }, accessState: "ACTIVE_OR_PENDING", preferences: { interests: ["Technology", "Science"], sourceLanguage: "Any", readingLanguage: "English", timezone: "Europe/Istanbul" } } : request<{ account: { email: string }; accessState: string; preferences: { interests: string[]; sourceLanguage: string; readingLanguage: string; timezone: string | null } | null }>("/me", token),
  savePreferences: async (token: string, value: { interests: string[]; sourceLanguage: string; readingLanguage: string }) => useFixtures ? { saved: true } : request<{ saved: true }>("/preferences", token, { method: "PUT", body: JSON.stringify(value) }),
  registerPush: async (token: string, pushToken: string, timezone: string) => useFixtures ? { registered: true } : request<{ registered: true }>("/push/register", token, { method: "POST", body: JSON.stringify({ token: pushToken, platform: "ios", timezone }) }),
  unregisterPush: async (token: string, pushToken: string) => useFixtures ? { unregistered: true } : request<{ unregistered: true }>("/push/unregister", token, { method: "POST", body: JSON.stringify({ token: pushToken }) }),
  deleteAccount: async (token: string) => useFixtures ? { deleted: true } : request<{ deleted: true }>("/account/delete", token, { method: "POST", body: JSON.stringify({ confirmation: "DELETE" }) }),
};
