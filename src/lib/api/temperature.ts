import { ApiError } from "./client";
import { gridPoints, type GridAxes, type TemperatureGrid } from "@/lib/utils/temperature-field";
import { shiftDate, todayUtc } from "@/lib/utils/dates";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const FORECAST_WINDOW_DAYS = 90;

export function temperatureEndpoint(date: string, today: string = todayUtc()): string {
  return date >= shiftDate(today, -FORECAST_WINDOW_DAYS) ? FORECAST_URL : ARCHIVE_URL;
}

type MeteoLocation = { daily?: { temperature_2m_max?: Array<number | null> } };

export async function fetchTemperatureGrid(
  axes: GridAxes,
  date: string,
  signal?: AbortSignal,
): Promise<TemperatureGrid> {
  const points = gridPoints(axes);
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(","),
    longitude: points.map((p) => p.lon).join(","),
    daily: "temperature_2m_max",
    start_date: date,
    end_date: date,
    timezone: "UTC",
  });

  let res: Response;
  try {
    res = await fetch(`${temperatureEndpoint(date)}?${params}`, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Não foi possível consultar a temperatura.");
  }

  if (res.status === 429) {
    throw new ApiError(
      "O limite de consultas de temperatura foi atingido. Tente novamente em instantes.",
      429,
    );
  }
  if (!res.ok) {
    throw new ApiError(`O serviço de temperatura respondeu com erro (${res.status}).`, res.status, res.status >= 500);
  }

  const json = (await res.json()) as MeteoLocation | MeteoLocation[];
  const list = Array.isArray(json) ? json : [json];
  if (list.length !== points.length) {
    throw new ApiError("Resposta de temperatura incompleta.");
  }

  const cols = axes.lons.length;
  const values: Array<Array<number | null>> = axes.lats.map((_, row) =>
    axes.lons.map((__, col) => {
      const v = list[row * cols + col]?.daily?.temperature_2m_max?.[0];
      return typeof v === "number" ? v : null;
    }),
  );
  const numeric = values.flat().filter((v): v is number => v !== null);
  if (!numeric.length) throw new ApiError("Sem dados de temperatura para este recorte.", 404, false);

  return {
    lons: axes.lons,
    lats: axes.lats,
    values,
    date,
    min: Math.min(...numeric),
    max: Math.max(...numeric),
  };
}
