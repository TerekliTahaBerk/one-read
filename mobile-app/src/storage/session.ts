import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "oneread.mobile.session.v1";
const PUSH_TOKEN_KEY = "oneread.mobile.push-token.v1";
const CACHE_PREFIX = "oneread.article-cache.v1.";
const CACHE_INDEX_KEY = "oneread.article-cache-index.v1";

async function getSecret(key: string) {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setSecret(key: string, value: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

async function deleteSecret(key: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const sessionStorage = {
  get: () => getSecret(TOKEN_KEY),
  set: (token: string) => setSecret(TOKEN_KEY, token),
  clear: async () => {
    await deleteSecret(TOKEN_KEY);
    await deleteSecret(PUSH_TOKEN_KEY);
    const keys = await AsyncStorage.getAllKeys();
    const cached = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    if (cached.length) await AsyncStorage.multiRemove(cached);
    await AsyncStorage.removeItem(CACHE_INDEX_KEY);
  },
};

export const pushTokenStorage = {
  get: () => getSecret(PUSH_TOKEN_KEY),
  set: (token: string) => setSecret(PUSH_TOKEN_KEY, token),
  clear: () => deleteSecret(PUSH_TOKEN_KEY),
};

export async function cacheArticle(id: string, value: unknown) {
  await AsyncStorage.setItem(`${CACHE_PREFIX}${id}`, JSON.stringify({ schema: 1, savedAt: new Date().toISOString(), value }));
  if (id !== "today") {
    let current: string[] = [];
    try {
      const parsed = JSON.parse((await AsyncStorage.getItem(CACHE_INDEX_KEY)) ?? "[]") as unknown;
      if (Array.isArray(parsed)) current = parsed.filter((item): item is string => typeof item === "string");
    } catch { current = []; }
    const next = [id, ...current.filter((item) => item !== id)].slice(0, 5);
    const removed = current.filter((item) => !next.includes(item));
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(next));
    if (removed.length) await AsyncStorage.multiRemove(removed.map((item) => `${CACHE_PREFIX}${item}`));
  }
}

export async function readCachedArticle(id: string) {
  const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${id}`);
  if (!raw) return null;
  try { const parsed = JSON.parse(raw) as { schema: number; value: unknown }; return parsed.schema === 1 ? parsed.value : null; } catch { return null; }
}
