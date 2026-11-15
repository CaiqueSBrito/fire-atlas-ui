"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ApiError } from "@/lib/api/client";
import { AnnualDataProvider } from "./annual-data-gate";

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (count, error) =>
              count < 2 && !(error instanceof ApiError && !error.recoverable),
            // falha do data lake costuma ser transitoria (throttle/tempo): espera crescente em vez de martelar
            retryDelay: (attempt) => Math.min(4_000, 600 * 2 ** attempt),
          },
        },
      }),
  );

  return (
    <NuqsAdapter>
      <QueryClientProvider client={client}>
        <AnnualDataProvider>{children}</AnnualDataProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
