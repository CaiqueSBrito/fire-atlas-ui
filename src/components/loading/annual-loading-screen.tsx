"use client";

import { bootstrapProgress, type AnnualLoadingState } from "@/lib/api/bootstrap";
import "./annual-loading-screen.css";

type Props = { status: AnnualLoadingState; onRetry: () => void };
const number = new Intl.NumberFormat("en-US");
const phaseLabel: Record<AnnualLoadingState["phase"], string> = {
  preparing: "Preparing queries",
  importing: "Exporting and importing data",
  indexes: "Building indexes",
  validating: "Validating keys",
  analyzing: "Updating statistics",
  ready: "Data ready",
};

export function AnnualLoadingScreen({ status, onRetry }: Props) {
  const failed = status.state === "failed";
  // Arquivos + indices/chaves/ANALYZE + o commit que publica ready. A ultima unidade so termina em ready.
  const completedWork = status.completedUnits + status.finalizationCompleted;
  const totalWork = status.totalUnits + status.finalizationTotal + 1;
  const percent = bootstrapProgress(status);

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
        <h1 className={"annual-title"}>{failed ? "Data loading was interrupted" : "Loading Fire Atlas"}</h1>
        <p className={"annual-description"}>Preparing 2026 fire hotspot data for you.</p>
        <div className={"annual-progressArea"}>
          <p className={"annual-detail"}>{phaseLabel[status.phase]}</p>
          <div
            className={"annual-track"}
            role="progressbar"
            aria-label="Worldwide 2026 data load"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={`${percent}% · ${phaseLabel[status.phase]} · ${completedWork} of ${totalWork} operations completed`}
          >
            <div className={"annual-fill"} style={{ width: `${percent}%` }} />
          </div>
          <div className={"annual-progressCaption"}>
            <p role="status">{status.message || "Connecting to the database…"}</p>
            <span className={"annual-percent"}>{percent}%</span>
          </div>
          <p className={"annual-scope"}>Worldwide <span aria-hidden>·</span> MODIS + VIIRS <span aria-hidden>·</span> H3 map 0–5</p>
          {status.totalUnits > 0 && (
            <p className={"annual-detail"}>
              Files: {number.format(status.completedUnits)} / {number.format(status.totalUnits)}
              {status.finalizationTotal > 0 && (
                <>{" · "}Finalization: {number.format(status.finalizationCompleted)} / {number.format(status.finalizationTotal)}</>
              )}
              <br />{number.format(status.rowsLoaded)} cached records
            </p>
          )}
          {!failed && <p className={"annual-hint"}>After importing, the database builds indexes and validates keys. Each confirmed operation advances the progress bar.</p>}
          {failed && (
            <div className={"annual-error"}>
              <p role="alert">{status.error || "Unable to finish loading data. Try again."}</p>
              <button type="button" onClick={onRetry} className={"annual-retry"}>Resume loading</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
