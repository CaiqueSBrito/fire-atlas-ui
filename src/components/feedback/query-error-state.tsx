"use client";

import { ApiError } from "@/lib/api/client";
import { NotImportedError } from "@/lib/api/coverage";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";

export function QueryErrorState({
  error,
  title,
  onRetry,
}: {
  error: Error;
  title?: string;
  onRetry: () => void;
}) {
  if (error instanceof NotImportedError) {
    return <EmptyState title="Nenhum dado importado" description={error.message} />;
  }
  return (
    <ErrorState
      title={title}
      message={error.message}
      onRetry={error instanceof ApiError && !error.recoverable ? undefined : onRetry}
    />
  );
}
