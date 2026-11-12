"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/utils/cn";

function NavList({ search }: { search: string }) {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={search ? `${item.href}?${search}` : item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full px-4 text-small font-semibold transition-colors",
                active
                  ? "bg-ember-400 text-space-950"
                  : "text-ink-300 hover:bg-space-800 hover:text-ink-100",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NavWithQuery() {
  const params = useSearchParams();
  return <NavList search={params.toString()} />;
}

export function MainNav() {
  return (
    <nav aria-label="Seções principais" className="overflow-x-auto">
      <Suspense fallback={<NavList search="" />}>
        <NavWithQuery />
      </Suspense>
    </nav>
  );
}
