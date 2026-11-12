import { Section } from "./section";

const QUESTIONS = [
  {
    q: "O que é um foco de calor?",
    a: "Uma anomalia térmica detectada por sensores de satélite no infravermelho termal. Pode ser gerada por incêndios florestais, queimadas agrícolas, erupções vulcânicas ou processos industriais, como a queima de gás.",
  },
  {
    q: "Por que harmonizar MODIS e VIIRS?",
    a: "Os dois registros não podem ser comparados diretamente. Harmonizá-los permite uma série histórica consistente, em que importam os padrões e as anomalias, e não de qual sensor veio cada dado.",
  },
  {
    q: "O que é o calendário de atividade de queima?",
    a: "Uma visão que integra o histórico e os dados recentes para identificar rapidamente padrões sazonais, anomalias e tendências em cada região, por exemplo em quais meses e anos houve mais focos.",
  },
  {
    q: "Só aparecem incêndios florestais?",
    a: "Não. Entram também queimadas agrícolas, limpeza de terreno, descarte de resíduos e atividades industriais, desde que sejam intensas o bastante para a detecção por satélite.",
  },
];

export function Faq() {
  return (
    <Section id="faq" title="Perguntas frequentes">
      <div className="flex max-w-3xl flex-col gap-3">
        {QUESTIONS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-space-600 bg-space-800 p-5"
          >
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 font-semibold">
              {item.q}
              <span
                aria-hidden
                className="text-ember-400 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-ink-300">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
