import { Section } from "./section";

export function AboutChallenge() {
  return (
    <Section id="about" title="O desafio">
      <div className="flex max-w-4xl flex-col gap-5 text-lg leading-relaxed text-ink-300">
        <p>
          Há mais de duas décadas, satélites acompanham focos de calor
          ativos. Mas o registro está dividido entre sensores cujos dados não
          podem ser comparados diretamente, e isso deixa gestores de
          emergência sem um retrato consistente de quando e onde houve
          queima.
        </p>
        <p>
          A proposta é <strong className="text-ink-100">harmonizar</strong>{" "}
          os registros MODIS e VIIRS em um calendário de atividade de
          queima, para que o sensor de origem deixe de importar e os
          padrões, as tendências e as anomalias passem a ser o foco.
        </p>
      </div>
    </Section>
  );
}
