import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";

type Options = {
  searchParams?: string;
  onUrlUpdate?: OnUrlUpdateFunction;
};

/** Renderiza com React Query (sem retry) e nuqs com memória, como no app. */
export function renderWithProviders(ui: ReactElement, opts: Options = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter
      searchParams={opts.searchParams ?? ""}
      onUrlUpdate={opts.onUrlUpdate}
      hasMemory
    >
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </NuqsTestingAdapter>
  );
  return { client, ...render(ui, { wrapper: Wrapper }) };
}
