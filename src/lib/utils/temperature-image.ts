import {
  fieldBounds,
  fieldSize,
  projector,
  renderField,
  type TemperatureGrid,
} from "./temperature-field";

type Ring = Array<[number, number]>;
type CountryCollection = {
  features: Array<{
    geometry: { type: string; coordinates: Ring[] | Ring[][] };
  }>;
};

let countriesPromise: Promise<CountryCollection | null> | null = null;

export function loadCountries(): Promise<CountryCollection | null> {
  countriesPromise ??= fetch("/data/countries.geojson")
    .then((r) => (r.ok ? (r.json() as Promise<CountryCollection>) : null))
    .catch(() => null);
  return countriesPromise;
}

function landMask(
  countries: CountryCollection,
  bounds: ReturnType<typeof fieldBounds>,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const { x, y } = projector(bounds, width, height);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  for (const feature of countries.features) {
    const { type, coordinates } = feature.geometry;
    const polygons = (type === "Polygon" ? [coordinates] : coordinates) as Ring[][];
    for (const polygon of polygons) {
      for (const ring of polygon) {
        ring.forEach(([lon, lat], i) => {
          if (i === 0) ctx.moveTo(x(lon), y(lat));
          else ctx.lineTo(x(lon), y(lat));
        });
        ctx.closePath();
      }
    }
  }
  ctx.fill("evenodd");
  return canvas;
}

/** Imagem PNG (data URL) do campo de temperatura, visível só sobre a terra. */
export function temperatureImage(
  grid: TemperatureGrid,
  countries: CountryCollection | null,
): string {
  const bounds = fieldBounds(grid);
  const { width, height } = fieldSize(bounds);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const pixels = renderField(grid, width, height);
  ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
  if (countries) {
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(landMask(countries, bounds, width, height), 0, 0);
  }
  return canvas.toDataURL("image/png");
}
