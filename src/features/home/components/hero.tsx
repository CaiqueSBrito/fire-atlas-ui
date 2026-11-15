import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SENSOR_META } from "@/lib/sensors";
import { HeroGlobe } from "./hero-globe";
import { RegionLinks } from "./region-links";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[calc(100svh-4.5rem)] flex-col overflow-hidden bg-space-950"
    >
      <HeroGlobe />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-space-950 via-space-950/75 to-transparent lg:bg-gradient-to-r lg:from-space-950 lg:via-space-950/55"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(45%_50%_at_8%_90%,rgba(229,36,43,0.16),transparent_70%)]"
      />

      <div className="flex flex-1 items-end px-6 pb-12 sm:px-10 lg:items-center lg:pb-0">
        <div className="flex max-w-2xl flex-col items-start gap-6">
          <p className="flex items-center gap-3 text-caption uppercase tracking-[0.3em] text-ink-300">
            <span aria-hidden className="flex gap-1.5">
              <span style={{ color: SENSOR_META.modis.hex }}>
                {SENSOR_META.modis.symbol}
              </span>
              <span style={{ color: SENSOR_META.viirs.hex }}>
                {SENSOR_META.viirs.symbol}
              </span>
            </span>
            NASA FIRMS · Space Apps 2026
          </p>
          <h1
            id="hero-title"
            className="font-display text-display font-bold leading-[1.02] tracking-tight"
          >
            MODIS e VIIRS,{" "}
            <span className="text-ember-400">um só calendário</span> de
            queimadas.
          </h1>
          <p className="max-w-lg text-lg text-ink-300">
            Mais de duas décadas de focos de calor em uma série comparável.
            Escolha uma região, percorra os dias e veja onde o fogo apareceu.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/explore/map"
              className={buttonVariants({
                variant: "primary",
                size: "lg",
                className: "shadow-[0_0_28px_rgba(229,36,43,0.4)]",
              })}
            >
              Explorar focos de calor
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/explore/calendar"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Abrir o calendário
            </Link>
          </div>
          <RegionLinks />
        </div>
      </div>
    </section>
  );
}
