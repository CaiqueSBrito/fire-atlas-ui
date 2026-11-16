import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="Fire Atlas — home"
      className="group inline-flex items-center gap-2.5 rounded-md py-1"
    >
      <span aria-hidden className="relative grid h-5 w-5 place-items-center">
        <span className="absolute inset-0 rounded-full bg-fire-500/40 blur-[6px] transition group-hover:bg-fire-400/60" />
        <span className="relative h-3.5 w-3.5 rounded-full bg-fire-500 shadow-[0_0_16px_var(--fire-400)]" />
      </span>
      <span className="bg-gradient-to-r from-ember-400 via-fire-400 to-fire-500 bg-clip-text font-display text-2xl font-extrabold tracking-tight text-transparent">
        Fire Atlas
      </span>
    </Link>
  );
}
