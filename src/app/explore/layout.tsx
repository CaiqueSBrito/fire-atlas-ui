import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { ExploreToolbar } from "@/components/layout/explore-toolbar";
import { DrawModeProvider } from "@/providers/draw-mode";
import { AnnualDataGate } from "@/providers/annual-data-gate";

export default function ExploreLayout({ children }: LayoutProps<"/explore">) {
  return (
    <DrawModeProvider>
      <div className="flex min-h-svh flex-col">
        <AnnualDataGate showLoading={false}>
          <SiteHeader />
          <Suspense fallback={null}>
            <ExploreToolbar />
          </Suspense>
        </AnnualDataGate>
        {children}
      </div>
    </DrawModeProvider>
  );
}
