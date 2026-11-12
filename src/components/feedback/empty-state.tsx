import type { ReactNode } from "react";

export function EmptyState({
  title = "Nenhum dado encontrado",
  description = "Não há detecções para os filtros selecionados. Tente ampliar o período ou mudar o satélite.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-space-600 bg-space-900 p-10 text-center"
    >
      <span aria-hidden className="text-3xl">
        ∅
      </span>
      <h2 className="font-display text-h2 font-bold">{title}</h2>
      <p className="max-w-prose text-ink-300">{description}</p>
      {action}
    </div>
  );
}
