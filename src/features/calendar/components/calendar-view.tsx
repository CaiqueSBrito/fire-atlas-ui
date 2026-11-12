"use client";

import { useRef, useState } from "react";
import { useQueryStates } from "nuqs";
import { getRegion } from "@/config/regions";
import {
  isValidDate,
  isValidMonth,
  monthOf,
  todayUtc,
} from "@/lib/utils/dates";
import { calendarParsers } from "../search-params";
import { CalendarPanel } from "./calendar-panel";
import { DetailView } from "./detail-view";
import { FlameIcon } from "./flame-icon";

export function CalendarView() {
  const [params, setParams] = useQueryStates(calendarParsers);
  const [open, setOpen] = useState(true); // RN01: abre/recolhe sob demanda

  const date = isValidDate(params.date) ? params.date : null;
  const month = isValidMonth(params.month)
    ? params.month
    : monthOf(date ?? todayUtc());
  const region = getRegion(params.region);
  const stageRef = useRef<HTMLDivElement>(null);

  const selectDate = (d: string) => {
    setParams({ date: d, month: monthOf(d) });
    // Em tela estreita o detalhe fica abaixo do painel: leva a vista até ele.
    if (window.matchMedia?.("(max-width: 1023px)").matches) {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() =>
        stageRef.current?.scrollIntoView({
          behavior: calm ? "auto" : "smooth",
          block: "start",
        }),
      );
    }
  };

  return (
    <main id="conteudo" className="flex flex-1 flex-col lg:flex-row">
      <div className="side-wrap" data-open={open}>
        <div className="side-inner" inert={!open}>
          <CalendarPanel
            month={month}
            region={region.id}
            selectedDate={date}
            onMonthChange={(m) => setParams({ month: m })}
            onSelectDate={selectDate}
            onClose={() => setOpen(false)}
          />
        </div>
      </div>

      <div
        ref={stageRef}
        className="calendar-stage flex min-w-0 flex-1 flex-col"
      >
        {!open && (
          <div className="reopen-bar px-5 pt-5 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded="false"
              className="group inline-flex items-center gap-3 rounded-full border border-ember-400/40 bg-space-900/80 py-1.5 pl-1.5 pr-4 text-small font-semibold shadow-[0_0_24px_rgba(229,36,43,0.2)] backdrop-blur transition hover:border-ember-400 hover:shadow-[0_0_30px_rgba(255,176,46,0.3)]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-fire-500/40 to-ember-400/20">
                <FlameIcon className="h-5 w-4" />
              </span>
              Abrir calendário
              <span
                aria-hidden="true"
                className="text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ember-400"
              >
                »
              </span>
            </button>
          </div>
        )}
        {date ? (
          <DetailView
            date={date}
            regionId={region.id}
            passTime={params.time}
            view={params.view}
            onChange={(patch) =>
              setParams({
                ...patch,
                // mantém o mês do painel acompanhando a data (RN06/CA03)
                ...(patch.date ? { month: monthOf(patch.date) } : {}),
              })
            }
          />
        ) : (
          <div className="grid min-h-[28rem] flex-1 place-items-center p-8 text-center">
            <div className="flex flex-col items-center">
              <div
                aria-hidden="true"
                className="relative mb-8 h-44 w-72"
              >
                {[-18, 0, 18].map((deg, i) => (
                  <span
                    key={deg}
                    className="deck-card"
                    style={{
                      transform: `rotate(${deg}deg)`,
                      animationDelay: `${i * 90}ms`,
                    }}
                  >
                    <FlameIcon className="h-14 w-10 drop-shadow-[0_0_10px_rgba(255,110,30,0.7)]" />
                  </span>
                ))}
              </div>
              <p className="text-caption uppercase tracking-[0.3em] text-ink-300">
                NASA FIRMS · MODIS e VIIRS
              </p>
              <h1 className="mt-2 font-display text-h1 font-bold leading-tight">
                Calendário de queimadas
              </h1>
              <p className="mt-2 max-w-md text-ink-300">
                Cada dia é uma carta. Escolha uma para virá-la e explorar a
                região, o mapa e os focos de calor detectados.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const t = todayUtc();
                    setParams({ date: t, month: monthOf(t) });
                  }}
                  className="rounded-xl bg-fire-500 px-5 py-2.5 font-semibold text-white shadow-[0_0_24px_rgba(229,36,43,0.45)] transition hover:bg-fire-400"
                >
                  Ver a carta de hoje
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
