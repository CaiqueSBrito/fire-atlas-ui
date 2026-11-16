import { SiteFooter } from "@/components/layout/site-footer";
import { AboutChallenge } from "@/features/home/components/about-challenge";
import { DataSources } from "@/features/home/components/data-sources";
import { Team } from "@/features/home/components/team";
import { Hero } from "@/features/home/components/hero";
import { HowItWorks } from "@/features/home/components/how-it-works";
import { AnnualDataGate } from "@/providers/annual-data-gate";

export default function Home() {
  return (
    <AnnualDataGate>
      <main id="conteudo" tabIndex={-1}>
        <Hero />
        <AboutChallenge />
        <HowItWorks />
        <DataSources />
        <Team />
      </main>
      <SiteFooter />
    </AnnualDataGate>
  );
}
