import { Section } from "./section";

const SOURCES = [
  {
    name: "MODIS",
    text: "Sensors aboard the Terra and Aqua satellites, with more than two decades of observations. They are nearing the end of their operational lives and are being replaced.",
  },
  {
    name: "VIIRS",
    text: "The sensor replacing MODIS, continuing the record with greater detail.",
  },
  {
    name: "Harmonized",
    text: "A series combining both sensors at the MODIS Aqua scale (equivalent active cells), while preserving the source.",
  },
  {
    name: "H3 hexagons",
    text: "On the map, hotspots are aggregated by hexagonal cell and day. This makes it possible to display millions of detections quickly, but a cell does not mark the exact location of a fire.",
  },
];

export function DataSources() {
  return (
    <Section id="data" title="Where the data comes from">
      <p className="max-w-prose text-ink-300">
        Hotspot data comes from{" "}
        <a
          href="https://firms.modaps.eosdis.nasa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ember-400 underline underline-offset-4"
        >
          NASA Earthdata FIRMS
        </a>
        . Thermal infrared sensors detect heat anomalies caused by wildfires,
        agricultural burning, volcanic eruptions, and industrial processes.
        MODIS and VIIRS cannot be compared directly because they have different
        spatial resolutions, sensitivities, and observation times. That is why
        harmonization matters.
      </p>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {SOURCES.map((s) => (
          <li
            key={s.name}
            className="rounded-2xl border border-space-600 bg-space-800 p-6"
          >
            <h3 className="font-display text-xl font-bold">{s.name}</h3>
            <p className="mt-2 text-ink-300">{s.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
