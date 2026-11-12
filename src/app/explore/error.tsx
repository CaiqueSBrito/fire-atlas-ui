"use client";

import { ErrorState } from "@/components/feedback/error-state";

// Em Next 16 o error boundary recebe `retry` (re-busca e re-renderiza).
export default function ExploreError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorState
      message={error.message || "Ocorreu um erro inesperado."}
      onRetry={retry}
    />
  );
}
