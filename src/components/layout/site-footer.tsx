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
