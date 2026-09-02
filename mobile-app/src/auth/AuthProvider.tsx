import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/api/client";
import { pushTokenStorage, sessionStorage } from "@/storage/session";

type AuthValue = {
  ready: boolean;
  token: string | null;
  pendingEmail: string | null;
  requestCode: (email: string) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  useEffect(() => { sessionStorage.get().then(setToken).finally(() => setReady(true)); }, []);

  const value = useMemo<AuthValue>(() => ({
    ready,
    token,
    pendingEmail,
    requestCode: async (email) => { await api.requestCode(email.trim().toLowerCase()); setPendingEmail(email.trim().toLowerCase()); },
    verifyCode: async (code) => {
      if (!pendingEmail) throw new Error("Request a new code first.");
      const result = await api.verifyCode(pendingEmail, code);
      await sessionStorage.set(result.token);
      setToken(result.token);
      setPendingEmail(null);
    },
    signOut: async () => {
      if (token) {
        const pushToken = await pushTokenStorage.get();
        if (pushToken) await api.unregisterPush(token, pushToken).catch(() => undefined);
        await api.logout(token).catch(() => undefined);
      }
      await sessionStorage.clear();
      setToken(null);
    },
  }), [pendingEmail, ready, token]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
