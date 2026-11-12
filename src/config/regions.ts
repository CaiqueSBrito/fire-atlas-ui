// Regiões selecionáveis. A caixa envolvente (bbox) é APROXIMADA e serve apenas
// para posicionar detecções na visualização; não representa a fronteira real.

export type Region = {
  id: string;
  label: string;
  /** [oeste, sul, leste, norte] em graus */
  bbox: [number, number, number, number];
};

export const REGIONS: readonly Region[] = [
  { id: "world", label: "Mundo", bbox: [-180, -60, 180, 80] },
  { id: "brasil", label: "Brasil", bbox: [-74, -34, -34, 6] },
  { id: "amazonas", label: "Amazonas", bbox: [-73.8, -9.8, -56.1, 2.3] },
  { id: "para", label: "Pará", bbox: [-58.9, -9.9, -46, 2.6] },
  { id: "mato-grosso", label: "Mato Grosso", bbox: [-61.7, -18, -50.2, -7.3] },
  { id: "tocantins", label: "Tocantins", bbox: [-50.7, -13.5, -45.7, -5.2] },
  { id: "maranhao", label: "Maranhão", bbox: [-48.8, -10.3, -41.8, -1] },
  { id: "bahia", label: "Bahia", bbox: [-46.6, -18.4, -37.3, -8.5] },
  { id: "minas-gerais", label: "Minas Gerais", bbox: [-51.1, -22.9, -39.9, -14.2] },
];

export const DEFAULT_REGION_ID = "world";

export function getRegion(id: string | null | undefined): Region {
  return (
    REGIONS.find((r) => r.id === id) ??
    REGIONS.find((r) => r.id === DEFAULT_REGION_ID)!
  );
}
