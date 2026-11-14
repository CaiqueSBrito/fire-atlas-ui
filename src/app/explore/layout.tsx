import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { ExploreToolbar } from "@/components/layout/explore-toolbar";
import { DrawModeProvider } from "@/providers/draw-mode";

export default function ExploreLayout({ children }: LayoutProps<"/explore">) {
  return (
    <DrawModeProvider>
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <Suspense fallback={null}>
          <ExploreToolbar />
        </Suspense>
        {children}
      </div>
    </DrawModeProvider>
  );
}
