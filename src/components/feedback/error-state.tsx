"use client";

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Não foi possível carregar os dados",
  message = "Verifique sua conexão e tente novamente.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-fire-500/60 bg-space-900 p-5 text-center"
    >
      <p className="font-display text-lg font-bold text-ink-100">{title}</p>
      <p className="mt-1 text-small text-ink-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-fire-500 px-4 py-2 text-small font-semibold text-white hover:bg-fire-400"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
