import { Suspense } from "react";
import { ExploreToolbar } from "@/components/layout/explore-toolbar";
import { DrawModeProvider } from "@/providers/draw-mode";
import { AnnualDataGate } from "@/providers/annual-data-gate";

export default function ExploreLayout({ children }: LayoutProps<"/explore">) {
  return (
    <DrawModeProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <AnnualDataGate showLoading={false}>
          <Suspense fallback={null}>
            <ExploreToolbar />
          </Suspense>
        </AnnualDataGate>
        {children}
      </div>
    </DrawModeProvider>
  );
}
