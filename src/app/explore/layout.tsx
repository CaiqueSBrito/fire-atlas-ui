import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { ExploreToolbar } from "@/components/layout/explore-toolbar";

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
