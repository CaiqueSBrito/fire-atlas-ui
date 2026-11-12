// Esqueleto do calendário (RN05: indicação visual de carregamento).
// Usado por loading.tsx e pelo fallback de Suspense da página.
export function CalendarSkeleton() {
  return (
    <main id="conteudo" aria-busy="true" className="flex flex-1 flex-col lg:flex-row">
      <div className="panel-surface w-full border-b border-space-600 p-5 lg:w-[30rem] lg:border-b-0 lg:border-r">
        <div className="h-11 animate-pulse rounded-xl bg-space-800" />
        <div className="mt-5 h-14 animate-pulse rounded-2xl bg-space-800" />
        <div className="mt-6 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }, (_, i) => (
            <span
              key={i}
              className="aspect-[3/4] animate-pulse rounded-lg bg-space-800"
            />
          ))}
        </div>
      </div>
      <div className="calendar-stage grid flex-1 place-items-center p-8">
        <p role="status" className="text-ink-300">
          Carregando calendário…
        </p>
      </div>
    </main>
  );
}
