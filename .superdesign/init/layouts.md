# Layouts

## `src/app/layout.tsx`
Root layout: fontes next/font, SkipLink, providers; body flex-col bg space-950

```tsx
import type { Metadata } from "next";
import { Space_Grotesk, Fustat, JetBrains_Mono } from "next/font/google";
import { SkipLink } from "@/components/layout/skip-link";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const sans = Fustat({
  variable: "--font-fustat",
  subsets: ["latin", "latin-ext"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fire Atlas — NASA Space Apps 2026",
  description:
    "Plataforma de exploração de focos de calor (NASA FIRMS: MODIS + VIIRS) com mapa, calendário e análises.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SkipLink />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
```

## `src/app/explore/layout.tsx`
Shell de /explore/*: SiteHeader + ExploreToolbar (barra de filtros; oculta no calendário) + children

```tsx
import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { ExploreToolbar } from "@/components/layout/explore-toolbar";
import { DrawModeProvider } from "@/providers/draw-mode";

export default function ExploreLayout({ children }: LayoutProps<"/explore">) {
  return (
    <DrawModeProvider>
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <Suspense fallback={null}>
          <ExploreToolbar />
        </Suspense>
        {children}
      </div>
    </DrawModeProvider>
  );
}
```

## `src/components/layout/site-header.tsx`
Cabeçalho: logo à esquerda, navegação em pílulas à direita (max-w-7xl)

```tsx
import { Logo } from "./logo";
import { MainNav } from "./main-nav";

export function SiteHeader() {
  return (
    <header className="border-b border-space-600 bg-space-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2">
        <Logo />
        <div className="order-last w-full md:order-none md:w-auto">
          <MainNav />
        </div>
      </div>
    </header>
  );
}
```

## `src/components/layout/logo.tsx`
Logo: ponto vermelho brilhante + 'Fire Atlas' em Space Grotesk

```tsx
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
```

## `src/components/layout/main-nav.tsx`
Navegação principal em pílulas; ativo = fundo ember-400 com texto escuro

```tsx
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
                "inline-flex h-12 items-center rounded-full px-4 text-base font-semibold leading-6 tracking-[-0.02em] transition-colors duration-200",
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
```

## `src/config/navigation.ts`
Itens do menu

```ts
export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/explore/map", label: "Mapa" },
  { href: "/explore/calendar", label: "Calendário" },
  { href: "/explore/statistics", label: "Análises" },
  { href: "/explore/forecasts", label: "Previsões" },
];
```

## `src/components/layout/explore-toolbar.tsx`
Barra de filtros global (não renderiza em /explore/calendar)

```tsx
"use client";

import { usePathname } from "next/navigation";
import { FilterBar } from "@/features/filters/components/filter-bar";

export function ExploreToolbar() {
  const pathname = usePathname();
  if (pathname.startsWith("/explore/calendar")) return null;

  return (
    <div className="border-b border-space-600 bg-space-900">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <FilterBar canDraw={pathname.startsWith("/explore/map")} />
      </div>
    </div>
  );
}
```

## `src/components/layout/page-section.tsx`
Wrapper de página das seções de exploração

```tsx
import type { ReactNode } from "react";

export function PageSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6"
    >
      <header>
        <h1 className="font-display text-h1 font-bold leading-tight">
          {title}
        </h1>
        {description && <p className="mt-2 text-ink-300">{description}</p>}
      </header>
      {children}
    </main>
  );
}
```

## `src/components/layout/site-footer.tsx`
Rodapé da home

```tsx
export function SiteFooter() {
  return (
    <footer className="border-t border-space-600 bg-space-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-small text-ink-300 sm:px-10">
        <p>
          NASA Space Apps Challenge 2026 · Desafio{" "}
          <a
            href="https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-100 underline underline-offset-4"
          >
            Harmonization of MODIS and VIIRS Hot Spots
          </a>
        </p>
        <p className="font-mono text-caption">
          Dados: NASA Earthdata FIRMS · MODIS + VIIRS
        </p>
      </div>
    </footer>
  );
}
```

## `src/components/layout/skip-link.tsx`
Link pular para o conteúdo

```tsx
export function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="sr-only rounded-md bg-ember-400 px-4 py-2 font-semibold text-space-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
    >
      Pular para o conteúdo
    </a>
  );
}
```

