import { Section } from "./section";

const SOURCES = [
  {
    name: "MODIS",
    text: "Sensores a bordo dos satélites Terra e Aqua, com mais de duas décadas de observações. Estão perto do fim da vida operacional e estão sendo substituídos.",
  },
  {
    name: "VIIRS",
    text: "Sensor que substitui o MODIS, com continuidade da série e maior nível de detalhe.",
  },
  {
    name: "Harmonizado",
    text: "Série consistente que combina os dois, sem perder a origem: dados originais e harmonizados continuam identificáveis.",
  },
];

export function DataSources() {
  return (
    <Section id="data" title="De onde vêm os dados">
      <p className="max-w-prose text-ink-300">
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
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
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
