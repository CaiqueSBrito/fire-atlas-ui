import { MapExplorer } from "@/features/map/components/map-explorer";
import { AnnualDataGate } from "@/providers/annual-data-gate";

export default function MapPage() {
  return <AnnualDataGate><MapExplorer /></AnnualDataGate>;
}
