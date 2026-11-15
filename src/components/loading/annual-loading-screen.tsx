"use client";

import type { AnnualLoadingState } from "@/lib/api/bootstrap";
import "./annual-loading-screen.css";

type Props = { status: AnnualLoadingState; onRetry: () => void };
const number = new Intl.NumberFormat("pt-BR");

export function AnnualLoadingScreen({ status, onRetry }: Props) {
  const failed = status.state === "failed";
  const percent = status.state === "ready"
    ? 100
    : status.totalUnits > 0
      ? Math.min(99, Math.floor((status.completedUnits / status.totalUnits) * 100))
      : 0;

  return (
    <div className={"annual-screen"}>
      <header className={"annual-header"}>
        <span className={"annual-brand"}><span aria-hidden className={"annual-beacon"} />Fire Atlas</span>
      </header>
      <main id="conteudo" tabIndex={-1} className={"annual-main"} aria-busy={!failed}>
        <div className={"annual-globe"} aria-hidden="true">
          <div className={"annual-earth"} />
          <span className={"annual-hotspot"} />
          <span className={"annual-hotspotSecondary"} />
        </div>
        <p className={"annual-eyebrow"}>NASA SPACE APPS 2026</p>
        <h1 className={"annual-title"}>{failed ? "A carga foi interrompida" : "Carregando o Fire Atlas"}</h1>
        <p className={"annual-description"}>Preparando os dados de focos de calor de 2026 para você.</p>
        <div className={"annual-progressArea"}>
          <div
            className={"annual-track"}
            role="progressbar"
            aria-label="Carga mundial de 2026"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={`${percent}% · ${status.completedUnits} de ${status.totalUnits} etapas concluídas`}
          >
            <div className={"annual-fill"} style={{ width: `${percent}%` }} />
          </div>
          <div className={"annual-progressCaption"}>
            <p role="status">{status.message || "Conectando à base de dados…"}</p>
            <span className={"annual-percent"}>{percent}%</span>
          </div>
          <p className={"annual-scope"}>Mundo inteiro <span aria-hidden>·</span> MODIS + VIIRS <span aria-hidden>·</span> H3 0–6</p>
          {status.totalUnits > 0 && (
            <p className={"annual-detail"}>
              {number.format(status.completedUnits)} / {number.format(status.totalUnits)} etapas
              {" · "}{number.format(status.rowsLoaded)} registros em cache
            </p>
          )}
          {!failed && <p className={"annual-hint"}>A primeira carga pode demorar. Os próximos acessos reutilizam os dados.</p>}
          {failed && (
            <div className={"annual-error"}>
              <p role="alert">{status.error || "Não foi possível concluir a carga. Tente novamente."}</p>
              <button type="button" onClick={onRetry} className={"annual-retry"}>Retomar carregamento</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
