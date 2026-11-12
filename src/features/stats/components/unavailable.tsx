export function Unavailable({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-dashed border-space-600 p-3 text-small text-ink-300">
      <span
        aria-hidden
        className="mt-0.5 rounded bg-space-800 px-1.5 py-0.5 font-mono text-caption uppercase text-ink-300"
      >
        n/d
      </span>
      <span>
        <strong className="text-ink-100">Indisponível.</strong> {children}
      </span>
    </p>
  );
}
