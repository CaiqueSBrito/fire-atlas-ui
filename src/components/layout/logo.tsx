import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-md font-display text-lg font-bold tracking-tight"
    >
      <span
        aria-hidden
        className="h-3 w-3 rounded-full bg-fire-500 shadow-[0_0_12px_var(--fire-400)]"
      />
      Fire Atlas
    </Link>
  );
}
