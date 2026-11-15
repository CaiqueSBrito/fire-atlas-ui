import type { ReactNode } from "react";

export function Section({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="border-t border-space-600"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-16 sm:px-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-16 lg:py-20">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <p className="font-mono text-caption text-ember-400">{index}</p>
          <h2
            id={`${id}-title`}
            className="mt-2 font-display text-h2 font-bold leading-tight tracking-tight"
          >
            {title}
          </h2>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}
