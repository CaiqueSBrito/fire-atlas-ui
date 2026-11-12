import { Section } from "./section";

const STEPS = [
  {
    title: "Escolha a área e o período",
    text: "Selecione uma região e um intervalo de datas para analisar.",
  },
  {
    title: "Veja o calendário de atividade",
    text: "O número de focos detectados do início dos anos 2000 até hoje, com escala de cores acessível e identificação em texto.",
  },
  {
    title: "Compare com o histórico",
    text: "Anomalias frente a médias de vários anos, o mês atual contra a mediana histórica e exportação dos focos em CSV.",
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
        Funcionalidades em construção: o mapa e as análises estão em
        desenvolvimento.
      </p>
    </Section>
  );
}
