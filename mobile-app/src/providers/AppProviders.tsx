import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/auth/AuthProvider";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } });
export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
}
