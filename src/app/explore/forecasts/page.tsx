import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { ForecastView } from "@/features/forecast/components/forecast-view";

export default function ForecastsPage() {
  if (!FEATURES.forecast) notFound();
  return <ForecastView />;
}
