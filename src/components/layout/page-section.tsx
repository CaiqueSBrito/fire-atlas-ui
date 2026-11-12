import type { ReactNode } from "react";

export function PageSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6"
    >
      <header>
        <h1 className="font-display text-h1 font-bold leading-tight">
          {title}
        </h1>
        {description && <p className="mt-2 text-ink-300">{description}</p>}
      </header>
      {children}
    </main>
  );
}
