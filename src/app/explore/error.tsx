"use client";

import { ErrorState } from "@/components/feedback/error-state";

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
