import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { ExploreToolbar } from "@/components/layout/explore-toolbar";

// Shell do ambiente principal: cabeçalho + menu + filtros + conteúdo.
// Cada página renderiza o próprio <main id="conteudo"> (a do calendário é
// em largura total). O layout não remonta entre seções (RN03).
export default function ExploreLayout({ children }: LayoutProps<"/explore">) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <Suspense fallback={null}>
        <ExploreToolbar />
      </Suspense>
      {children}
    </div>
  );
}
