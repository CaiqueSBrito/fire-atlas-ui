import { Button } from "@/components/ui/button";

/**
 * Falha visível (RN05/CA04). Só mostra "Tentar novamente" quando a falha é
 * recuperável, ou seja, quando `onRetry` é informado.
 */
export function ErrorState({
  title = "Não foi possível carregar os dados",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-2xl border border-fire-500 bg-space-900 p-10 text-center"
    >
      <span aria-hidden className="text-3xl">
        ⚠
      </span>
      <h2 className="font-display text-h2 font-bold">{title}</h2>
      {message && <p className="max-w-prose text-ink-300">{message}</p>}
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
