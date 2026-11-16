export function CalendarSkeleton() {
  return (
    <main id="conteudo" aria-busy="true" className="mx-auto w-full max-w-7xl flex-1 px-6 pb-14 pt-8 sm:px-10">
      <div className="h-4 w-48 animate-pulse rounded bg-space-800" />
      <div className="mt-3 h-12 w-96 max-w-full animate-pulse rounded-xl bg-space-800" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="h-12 w-28 animate-pulse rounded-full bg-space-800" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <div className="aspect-[16/10] animate-pulse rounded-2xl bg-space-800" />
          <div className="h-72 animate-pulse rounded-2xl bg-space-800" />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-4">
          <div className="h-96 animate-pulse rounded-2xl bg-space-800" />
          <div className="h-72 animate-pulse rounded-2xl bg-space-800" />
        </div>
      </div>
      <p role="status" className="sr-only">
        Loading calendar…
      </p>
    </main>
  );
}
