import { Section } from "./section";

const AUDIENCE = [
  "Alerta precoce e resposta a emergências",
  "Cientistas",
  "Gestores de terras",
  "Bombeiros",
];

export function AboutChallenge() {
  return (
    <Section id="about" title="O desafio">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex max-w-prose flex-col gap-4 text-ink-300">
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
        <div>
          <h3 className="font-display text-xl font-bold">Para quem é</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {AUDIENCE.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-space-600 bg-space-800 px-4 py-3"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
