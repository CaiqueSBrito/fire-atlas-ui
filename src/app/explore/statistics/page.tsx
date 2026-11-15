import { StatsDashboard } from "@/features/stats/components/stats-dashboard";
import { AnnualDataGate } from "@/providers/annual-data-gate";

export default function StatisticsPage() {
  return <AnnualDataGate><StatsDashboard /></AnnualDataGate>;
}
