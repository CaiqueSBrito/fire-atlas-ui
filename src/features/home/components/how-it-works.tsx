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
    <Section id="how" index="02" title="O que a plataforma propõe">
      <ol className="divide-y divide-space-600 border-y border-space-600">
        {STEPS.map((step, i) => (
          <li key={step.title} className="grid grid-cols-[3.5rem_1fr] gap-4 py-6">
            <span
              aria-hidden
              className="font-display text-4xl font-bold leading-none text-space-600"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="font-display text-xl font-bold">
                <span className="sr-only">Passo {i + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-1 max-w-xl text-ink-300">{step.text}</p>
            </div>
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
