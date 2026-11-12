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
          title="Não foi possível carregar o calendário"
          message="Ocorreu um erro inesperado. Você pode tentar novamente."
          onRetry={retry}
        />
      </div>
    </main>
  );
}
