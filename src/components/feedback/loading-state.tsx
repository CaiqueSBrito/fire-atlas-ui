export function LoadingState({
  label = "Carregando dados…",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-space-600 bg-space-900 p-10 text-center"
    >
      <span
        aria-hidden
        className="h-10 w-10 animate-spin rounded-full border-4 border-space-600 border-t-ember-400"
      />
      <p className="text-ink-100">{label}</p>
    </div>
  );
}
