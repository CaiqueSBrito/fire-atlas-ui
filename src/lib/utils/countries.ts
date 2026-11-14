export type Ring = Array<[number, number]>;

export type CountryFeature = {
  properties: { name?: string; continent?: string };
  geometry: { type: string; coordinates: Ring[] | Ring[][] };
};

export type CountryCollection = { features: CountryFeature[] };

let countriesPromise: Promise<CountryCollection | null> | null = null;

export function loadCountries(): Promise<CountryCollection | null> {
  countriesPromise ??= fetch("/data/countries.geojson")
    .then((r) => (r.ok ? (r.json() as Promise<CountryCollection>) : null))
    .catch(() => null);
  return countriesPromise;
}
