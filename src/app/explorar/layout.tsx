// Shell do ambiente principal: cabeçalho + menu + área de conteúdo.
// Layouts não remontam na navegação entre seções, o que ajuda a manter os
// filtros (RN03). Os filtros ficam na URL (query string) — ver CLAUDE.md.
export default function ExplorarLayout({
  children,
}: LayoutProps<"/explorar">) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
