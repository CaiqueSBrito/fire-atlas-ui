import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { HeroGlobe } from "./hero-globe";
import { LiveStats } from "./live-stats";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[calc(100svh-4.5rem)] flex-col overflow-hidden bg-space-950"
    >
      <HeroGlobe />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-space-950 via-space-950/70 to-transparent lg:bg-gradient-to-r lg:via-space-950/50"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 items-end px-6 pb-12 pt-16 sm:px-10 lg:items-center lg:py-16">
        <div className="flex max-w-3xl flex-col items-start gap-6">
          <p className="font-mono text-caption uppercase tracking-[0.2em] text-ember-400">
            NASA Space Apps 2026
          </p>
          <h1
            id="hero-title"
            className="max-w-xl font-display text-display font-bold leading-[1.05] tracking-tight"
          >
            The planet&apos;s hotspots, in one atlas.
          </h1>
          <p className="max-w-xl text-lg text-ink-300">
            Explore NASA FIRMS detections from MODIS and VIIRS satellites through
            maps, calendars, and analytics.
          </p>
          <Link
            href="/explore/map"
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            Explore hotspots
            <span aria-hidden>→</span>
          </Link>
          <LiveStats />
          <p className="font-mono text-caption text-ink-300">
            Data: NASA FIRMS · MODIS + VIIRS
          </p>
        </div>
      </div>
    </section>
  );
}
