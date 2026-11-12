import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AboutChallenge } from "@/features/home/components/about-challenge";
import { DataSources } from "@/features/home/components/data-sources";
import { Faq } from "@/features/home/components/faq";
import { Hero } from "@/features/home/components/hero";
import { HowItWorks } from "@/features/home/components/how-it-works";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1}>
        <Hero />
        <AboutChallenge />
        <HowItWorks />
        <DataSources />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
