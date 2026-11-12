"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 2, staleTime: 5 * 60_000, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <NuqsAdapter>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </NuqsAdapter>
  );
}
