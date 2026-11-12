// DTOs do calendário de queimadas (NASA-013).
// Datas sempre em UTC, formato ISO "YYYY-MM-DD"; meses "YYYY-MM".

export type Sensor = "MODIS" | "VIIRS";

/**
 * Estado de uma data (RN07):
 * - activity: há dados e ao menos uma detecção
 * - none: há dados, mas nenhuma detecção (zero registrado)
 * - unavailable: não há dados para a data (nunca inventar detecções)
 */
export type DayStatus = "activity" | "none" | "unavailable";

/** Horário da passagem do satélite. */
export type PassTime = "all" | "day" | "night";

/** Contagem por sensor — só presente quando a API informa. */
export type SensorCounts = Partial<Record<Sensor, number>>;

export type DataSource = {
  name: string;
  simulated: boolean;
};

export type MonthDay = {
  date: string;
  status: DayStatus;
  counts?: SensorCounts;
};

export type MonthResponse = {
  month: string;
  region: string;
  days: MonthDay[];
  source: DataSource;
};

export type Detection = {
  lat: number;
  lon: number;
  sensor: Sensor;
  /** D = passagem diurna, N = noturna */
  dayNight: "D" | "N";
};

export type ImageryKind = "thermal" | "geographic";

/** Imagem com proveniência (fonte + data) obrigatória. */
export type Imagery = {
  kind: ImageryKind;
  url: string;
  source: string;
  date: string;
};

export type DayResponse = {
  date: string;
  region: string;
  passTime: PassTime;
  status: DayStatus;
  counts?: SensorCounts;
  detections: Detection[];
  imagery: Imagery[];
  source: DataSource;
};
