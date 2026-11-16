"use client";

import { Suspense, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/utils/cn";

function NavList({ search }: { search: string }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;

    const firstRender = !container.dataset.ready;
    if (firstRender) indicator.style.transition = "none";

    const updateIndicator = () => {
      const activeLink = container.querySelector<HTMLAnchorElement>(
        'a[aria-current="page"]',
      );
      indicator.style.opacity = activeLink ? "1" : "0";
      if (!activeLink) return;

      indicator.style.transform = `translateX(${activeLink.offsetLeft}px)`;
      indicator.style.width = `${activeLink.offsetWidth}px`;
    };

    updateIndicator();
    container.dataset.ready = "true";
    const frame = requestAnimationFrame(() => {
      indicator.style.transition = "";
    });
    const observer = new ResizeObserver(updateIndicator);
    container.querySelectorAll("a").forEach((link) => observer.observe(link));

    return () => {
      cancelAnimationFrame(frame);
      indicator.style.transition = "";
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <div ref={containerRef} className="group relative isolate w-max">
      <span
        ref={indicatorRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-12 rounded-full bg-ember-400 opacity-0 transition-[transform,width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      />
      <ul className="relative flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={search ? `${item.href}?${search}` : item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-12 items-center whitespace-nowrap rounded-full px-4 text-base font-semibold leading-6 tracking-[-0.02em] transition-colors duration-200 motion-reduce:transition-none",
                  active
                    ? "bg-ember-400 text-space-950 group-data-[ready=true]:bg-transparent"
                    : "text-ink-300 hover:bg-space-800/50 hover:text-ink-100",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NavWithQuery() {
  const params = useSearchParams();
  return <NavList search={params.toString()} />;
}

export function MainNav() {
  return (
    <nav aria-label="Main navigation" className="overflow-x-auto">
      <Suspense fallback={<NavList search="" />}>
        <NavWithQuery />
      </Suspense>
    </nav>
  );
}
