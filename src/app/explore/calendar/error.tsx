"use client"; // Error boundaries precisam ser Client Components

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";

// Nesta versão do Next o boundary recebe `retry` (re-busca e re-renderiza).
export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="conteudo" className="grid flex-1 place-items-center p-8">
      <div className="w-full max-w-md">
        <ErrorState
          title="Unable to load the calendar"
          message="An unexpected error occurred. You can try again."
          onRetry={retry}
        />
      </div>
    </main>
  );
}
