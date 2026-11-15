import { HARMONIZED_META, SENSOR_META } from "@/lib/sensors";
import { Section } from "./section";

const SOURCES = [
  {
    name: "MODIS",
    glyph: SENSOR_META.modis.symbol,
    color: SENSOR_META.modis.hex,
    text: "Sensores a bordo dos satélites Terra e Aqua, com mais de duas décadas de observações. Estão perto do fim da vida operacional e estão sendo substituídos.",
  },
  {
    name: "VIIRS",
    glyph: SENSOR_META.viirs.symbol,
    color: SENSOR_META.viirs.hex,
    text: "Sensor que substitui o MODIS, com continuidade da série e maior nível de detalhe.",
  },
  {
    name: "Harmonizado",
    glyph: HARMONIZED_META.symbol,
    color: HARMONIZED_META.hex,
    text: "Série consistente que combina os dois, sem perder a origem: dados originais e harmonizados continuam identificáveis.",
  },
];

export function DataSources() {
  return (
    <Section id="data" index="03" title="De onde vêm os dados">
      <p className="max-w-2xl text-ink-300">
        Os focos de calor vêm do{" "}
        <a
          href="https://firms.modaps.eosdis.nasa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ember-400 underline underline-offset-4"
        >
          NASA Earthdata FIRMS
        </a>
        . Sensores de infravermelho termal detectam anomalias de calor
        geradas por incêndios, queimadas agrícolas, erupções vulcânicas e
        processos industriais. MODIS e VIIRS não podem ser comparados
        diretamente, porque têm resoluções espaciais, sensibilidades e
        horários de observação diferentes. Por isso a harmonização.
      </p>
      <dl className="mt-8 divide-y divide-space-600 border-y border-space-600">
        {SOURCES.map((s) => (
          <div
            key={s.name}
            className="grid gap-1 py-5 sm:grid-cols-[11rem_1fr] sm:gap-6"
          >
            <dt className="flex items-center gap-3 font-display text-lg font-bold">
              <span aria-hidden style={{ color: s.color }}>
                {s.glyph}
              </span>
              {s.name}
            </dt>
            <dd className="max-w-xl text-ink-300">{s.text}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
