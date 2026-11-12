import type { ReactNode } from "react";

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="mx-auto w-full max-w-7xl px-6 py-14 sm:px-10"
    >
      <h2
        id={`${id}-title`}
        className="font-display text-h2 font-bold leading-tight tracking-tight"
      >
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}
