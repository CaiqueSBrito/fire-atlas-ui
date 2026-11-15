import { Section } from "./section";

const STEPS = [
  {
    title: "Escolha a área e o período",
    text: "Pelo botão Filtros: sensores, continente ou estado do Brasil, uma área desenhada no mapa ou digitada em coordenadas e o período, com atalhos de 7 e 30 dias, mês e ano.",
  },
  {
    title: "Explore o mapa",
    text: "Os focos aparecem somados em hexágonos: de longe, células de centenas de quilômetros; ao aproximar, cada vez menores, até cerca de 7 km. Clique numa célula para ver quantos focos vieram de cada sensor.",
  },
  {
    title: "Acompanhe no calendário e nas análises",
    text: "Cartas por dia com a contagem de cada sensor, série temporal, células com mais detecções, dias de atividade incomum e comparação com anos anteriores quando houver histórico carregado.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how" title="O que a plataforma propõe">
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="rounded-2xl border border-space-600 bg-space-800 p-6"
          >
            <span className="font-mono text-small text-ember-400">
              Passo {i + 1}
            </span>
            <h3 className="mt-1 font-display text-xl font-bold">
              {step.title}
            </h3>
            <p className="mt-2 text-ink-300">{step.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-small text-ink-300">
        Em preparação: a atividade harmonizada MODIS + VIIRS, que o time de dados está gerando e
        aparecerá no calendário quando for publicada.
      </p>
    </Section>
  );
}
