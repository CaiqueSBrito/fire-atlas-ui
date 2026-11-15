import Link from "next/link";

const LINKS = [
  { href: "/explore/map", label: "Mapa" },
  { href: "/explore/calendar", label: "Calendário" },
  { href: "/explore/statistics", label: "Análises" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-space-600 bg-space-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-small text-ink-300 sm:px-10 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
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
            Dados: NASA Earthdata FIRMS · MODIS + VIIRS · células H3 · mapa base © OpenStreetMap
          </p>
        </div>
        <nav aria-label="Atalhos do rodapé">
          <ul className="flex flex-wrap gap-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex h-12 items-center rounded-full border border-space-600 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 transition-colors duration-200 hover:border-ember-400 hover:text-ember-400"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
