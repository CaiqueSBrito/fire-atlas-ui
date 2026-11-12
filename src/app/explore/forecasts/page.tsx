import { notFound } from "next/navigation";
import { PageSection } from "@/components/layout/page-section";
import { FEATURES } from "@/config/features";

// Previsão é opcional e só existe com a feature flag ligada.
export default function ForecastsPage() {
  if (!FEATURES.forecast) notFound();
  return (
    <PageSection
      title="Previsões"
      description="Modelo preditivo opcional. Seção em desenvolvimento."
    />
  );
}
