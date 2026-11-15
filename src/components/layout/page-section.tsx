import type { ReactNode } from "react";
import { FlameIcon } from "@/features/calendar/components/flame-icon";

export function PageSection({
  eyebrow = "NASA FIRMS · MODIS e VIIRS",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <main id="conteudo" tabIndex={-1} className="calendar-stage flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-8 lg:px-8">
        <header className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-ember-400/30 bg-gradient-to-br from-fire-500/30 to-ember-400/10 shadow-[0_0_22px_rgba(229,36,43,0.3)]"
          >
            <FlameIcon className="h-6 w-[1.125rem]" />
          </span>
          <div className="min-w-0">
            <p className="text-caption uppercase tracking-[0.3em] text-ink-300">
              {eyebrow}
            </p>
            <h1 className="mt-1 font-display text-h1 font-bold leading-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-3xl text-ink-300">{description}</p>
            )}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
