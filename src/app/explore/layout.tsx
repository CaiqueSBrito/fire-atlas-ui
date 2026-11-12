import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { ExploreToolbar } from "@/components/layout/explore-toolbar";

// Shell do ambiente principal: cabeçalho + menu + filtros/calendário + conteúdo.
// O layout não remonta entre seções, e os filtros ficam na URL (RN03).
export default function ExploreLayout({ children }: LayoutProps<"/explore">) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <Suspense fallback={<div className="h-20 border-b border-space-600 bg-space-900" />}>
        <ExploreToolbar />
      </Suspense>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6"
      >
        {children}
      </main>
    </div>
  );
}
