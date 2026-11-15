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
    q: "Por que o mapa mostra hexágonos e não pontos?",
    a: "Os dados chegam somados por célula hexagonal (sistema H3), por dia e por sensor. Ao aproximar, as células ficam menores, até cerca de 7 km. Dentro de uma célula não se sabe a posição exata de cada foco, por isso o mapa não desenha pontos.",
  },
  {
    q: "Não ter registro significa que não houve fogo?",
    a: "Não. Nuvens, fumaça, o horário de passagem do satélite e o tamanho do fogo afetam a detecção. A plataforma nunca trata a ausência de registro como ausência de fogo, e diferencia dia sem foco de dia sem dado.",
  },
  {
    q: "Os números podem mudar depois?",
    a: "Sim. Os meses recentes vêm do processamento quase em tempo real (NRT) da FIRMS e podem ser revisados, e o dia corrente só fica completo depois que termina.",
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
