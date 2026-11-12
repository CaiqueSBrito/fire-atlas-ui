import { Logo } from "./logo";
import { MainNav } from "./main-nav";

/** Cabeçalho compartilhado: logo + menu (home e ambiente principal). */
export function SiteHeader() {
  return (
    <header className="border-b border-space-600 bg-space-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2">
        <Logo />
        <div className="order-last w-full md:order-none md:w-auto">
          <MainNav />
        </div>
      </div>
    </header>
  );
}
