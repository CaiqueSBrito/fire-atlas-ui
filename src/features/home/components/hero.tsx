import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { GlobeLoader } from "./globe-loader";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[calc(100svh-4.5rem)] flex-col overflow-hidden bg-space-950"
    >
      {/* Globo decorativo: o conteúdo equivalente está no texto ao lado. */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <GlobeLoader />
      </div>
      {/* Garante contraste do texto sobre o globo */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-space-950 via-space-950/70 to-transparent lg:bg-gradient-to-r lg:via-space-950/50"
      />

      <div className="flex flex-1 items-end px-6 pb-12 sm:px-10 lg:items-center lg:pb-0">
        <div className="flex max-w-xl flex-col items-start gap-6">
          <p className="font-mono text-caption uppercase tracking-[0.2em] text-ember-400">
            NASA Space Apps 2026
          </p>
          <h1
            id="hero-title"
            className="font-display text-display font-bold leading-[1.05] tracking-tight"
          >
            Focos de calor do planeta, em um só atlas.
          </h1>
          <p className="text-lg text-ink-300">
            Explore as detecções dos satélites MODIS e VIIRS da NASA FIRMS em
            mapa, calendário e análises.
          </p>
          <Link
            href="/explore/map"
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            Explorar focos de calor
            <span aria-hidden>→</span>
          </Link>
          <p className="font-mono text-caption text-ink-300">
            Dados: NASA FIRMS · MODIS + VIIRS
          </p>
        </div>
      </div>
    </section>
  );
}
