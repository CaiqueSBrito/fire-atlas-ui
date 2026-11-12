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
    <section aria-labelledby="page-title" className="flex flex-col gap-6">
      <header>
        <h1
          id="page-title"
          className="font-display text-h1 font-bold leading-tight"
        >
          {title}
        </h1>
        {description && <p className="mt-2 text-ink-300">{description}</p>}
      </header>
      {children}
    </section>
  );
}
