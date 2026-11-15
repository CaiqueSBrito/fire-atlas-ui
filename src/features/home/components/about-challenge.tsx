import { Section } from "./section";

const AUDIENCE = [
  "Alerta precoce e resposta a emergências",
  "Cientistas",
  "Gestores de terras",
  "Bombeiros",
];

export function AboutChallenge() {
  return (
    <Section id="about" index="01" title="O desafio">
      <p className="max-w-2xl font-display text-xl leading-snug text-ink-100 sm:text-2xl">
        Há mais de duas décadas, satélites acompanham focos de calor ativos. O
        registro, porém, está dividido entre sensores cujos dados não podem ser
        comparados diretamente.
      </p>
      <p className="mt-5 max-w-2xl text-ink-300">
        Sem um retrato consistente de quando e onde houve queima, gestores de
        emergência ficam no escuro. A proposta é{" "}
        <strong className="text-ink-100">harmonizar</strong> os registros MODIS
        e VIIRS em um calendário de atividade de queima, para que o sensor de
        origem deixe de importar e os padrões, as tendências e as anomalias
        passem a ser o foco.
      </p>
      <p className="mt-10 text-caption uppercase tracking-[0.2em] text-ink-300">
        Para quem é
      </p>
      <ul className="mt-3 divide-y divide-space-600 border-y border-space-600">
        {AUDIENCE.map((item) => (
          <li key={item} className="py-3 text-ink-100">
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}
