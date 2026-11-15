import { ForecastView } from "@/features/forecast/components/forecast-view";
import { AnnualDataGate } from "@/providers/annual-data-gate";

export default function ForecastsPage() {
  return <AnnualDataGate><ForecastView /></AnnualDataGate>;
}
