"use client";

import Link from "next/link";
import { REGIONS } from "@/config/regions";
import { markIntroFly } from "@/lib/utils/intro-fly";

const CONTINENT_IDS = [
  "north-america",
  "south-america",
  "europe",
  "africa",
  "asia",
  "oceania",
];

export function RegionLinks() {
  const regions = REGIONS.filter((r) => CONTINENT_IDS.includes(r.id));
  return (
    <nav aria-label="Explorar por região" className="flex flex-col gap-2">
      <p className="text-caption uppercase tracking-[0.2em] text-ink-300">Ou comece por uma região:</p>
      <ul className="flex flex-wrap gap-2">
        {regions.map((r) => (
          <li key={r.id}>
            <Link
              href={`/explore/map?region=${r.id}`}
              onClick={markIntroFly}
              className="inline-flex h-10 items-center rounded-full border border-space-600 bg-space-950/60 px-4 text-small font-semibold leading-6 tracking-[-0.02em] text-ink-100 transition-colors duration-200 hover:border-ember-400 hover:text-ember-400"
            >
              {r.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
