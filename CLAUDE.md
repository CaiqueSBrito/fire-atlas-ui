# Fire Atlas UI — NASA Space Apps 2026

Frontend (Next.js) de uma plataforma de exploração de focos de calor/queimadas
a partir de dados **NASA FIRMS (MODIS + VIIRS)**. Este repositório é **só o frontend**.

> **Next.js nesta versão tem breaking changes.** Antes de escrever código, leia o
> guia relevante em `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## Arquitetura geral (documento Dados_NASA_2026)

NASA FIRMS (+ meteorologia opcional) → Ingestão/validação → Repositório
(arquivos brutos + PostgreSQL) → Harmonização MODIS×VIIRS / Modelo preditivo
(opcional, Python) → **API Backend Spring Boot** (mapa, filtros, calendário,
indicadores) → **Frontend Next.js** (globo 3D, mapa, calendário, cartas).

Regras de dados: dados originais e harmonizados **preservam a origem**
(mostrar MODIS/VIIRS/harmonizado de forma identificável). **A previsão nunca
bloqueia o fluxo principal** — se falhar, o resto da plataforma continua.

## Desafio NASA Space Apps 2026: "Harmonization of MODIS and VIIRS Hot Spots"

Fonte: https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/
Construir uma aplicação web que **harmoniza os hotspots MODIS e VIIRS (NASA FIRMS)**
num **calendário de atividade de queima** (nº de focos do início dos anos 2000 até hoje),
para alerta precoce/emergência, cientistas, gestores de terra e bombeiros.
Ideias do desafio: selecionar região (desenhar área ou lat/lon) e período; comparar
mês atual com a mediana histórica e anomalias vs. médias multianuais; escala de cores
**acessível**; **exportar CSV** dos focos. MODIS (Terra/Aqua) está no fim da vida e
é substituído pelo VIIRS; os registros diferem em resolução, sensibilidade e horário.
Os textos da home seguem o enunciado oficial — não inventar dados/números.

## Escopo da tarefa atual: Home + layout + navegação

- **RN01** Home com globo 3D (ou equivalente) que reage ao mouse.
- **RN02** Botão vermelho abre/expande o ambiente principal (mapa, filtros, calendário).
- **RN03** Navegar entre seções sem perder filtros desnecessariamente.
- **RN04** Controles utilizáveis em vários tamanhos de tela e por teclado.
- **RN05** Carregando / erro / sem dados com indicação visual; **retry** em falhas recuperáveis.
- Aceite: CA01 botão→explorar · CA02 globo responde ao mouse · CA03 seção correta
  ao navegar · CA04 falha informada + nova tentativa.

## Rotas

| Rota | Conteúdo |
|---|---|
| `/` | Home: cabeçalho + hero (globo + botão vermelho) + seções (desafio, proposta, dados, FAQ) + rodapé |
| `/explore` | Redireciona para `/explore/map` |
| `/explore/map` | Mapa interativo MapLibre + base NASA GIBS, camadas MODIS ◆ / VIIRS ●, pontos ou hexágonos H3, área por desenho ou coordenadas, detalhes da detecção (NASA-012) |
| `/explore/calendar` | Calendário de queimadas (cartas interativas, sidebar retrátil própria) — feature NASA-013 |
| `/explore/statistics` | Dashboard: indicadores, série temporal, histórico/anomalia, ranking e períodos críticos (NASA-014) |
| `/explore/forecasts` | Previsões (NASA-015) — **só existe com `NEXT_PUBLIC_FEATURE_FORECAST=true`** (404 caso contrário) |

O **calendário é uma rota própria** (`/explore/calendar`, feature `features/calendar`, com
sidebar retrátil, região e estado na URL: `month`, `date`, `region`, `time`, `view`).
A barra de filtros global (satélite/período) fica oculta nessa rota. O painel "Mapa de focos"
da carta do dia usa o mapa real (`DayMap` → `FireMap`) e cai no `RegionPlot` esquemático
quando não há WebGL (`lib/utils/webgl.ts`); a mini-carta dourada continua esquemática.
Ao trocar de dia o mapa enquadra, com animação, a área dos focos do dia (`bboxOfPoints`);
sem focos volta a enquadrar a região.

**Padrão:** rotas (URLs e nomes de pastas em `app/`) sempre em inglês; textos da interface em português.

`src/app/explore/layout.tsx` é o shell compartilhado (`SiteHeader` + filtros + `children`).
Cada página renderiza o próprio `<main id="conteudo">` (o calendário é largura total;
as demais usam `PageSection`).
`explore/loading.tsx` e `explore/error.tsx` cobrem todas as seções (RN05). Nesta versão do
Next o error boundary recebe **`retry`** (não `reset`).

## Fluxo de exploração (globo → mapa 2D → foco inclinado)

1. **Home:** o globo 3D é clicável. O clique vira latitude/longitude (`vectorToLatLon`), o
   continente vem do ponto dentro dos países (`continentAt`, `public/data/countries.geojson` com a
   propriedade `continent`) e abre `/explore/map?region=<continente>`; passar o mouse mostra
   "Clique para explorar: <continente>". Alternativa por teclado e celular: os atalhos
   `RegionLinks` ("Ou comece por uma região"). Ambos marcam `markIntroFly()` (sessionStorage).
2. **Mapa (`/explore/map`) começa como globo 3D** (MapLibre `vertical-perspective`, `GLOBE_PROJECTION`)
   quando a região é `world` e não há `bbox`: passar o mouse mostra "Clique para explorar:
   <continente>"; clicar num continente (`continentAt`) grava `region=<id>` na URL e a câmera faz
   zoom animado até a região, achatando para o mapa 2D (projeção interpola para mercator entre os
   zooms 1,8 e 2,4). Os continentes são regiões em `config/regions.ts`, também no filtro e no
   calendário. Vindo da home, o mapa já começa no globo e faz o voo (`introFly`).
3. **Inclinação automática:** selecionar um ponto ou um hexágono H3 (mapa ou lista) dá zoom
   (`TERRAIN_3D.zoom`, ou `hexFocusZoom(res)` no hexágono) e inclina a vista com relevo (AWS Terrain
   Tiles, DEM Terrarium, hillshade; 60°, exagero 1,6). Fechar o detalhe ou clicar no vazio volta à
   câmera 2D anterior; "Voltar ao 2D" / "Ver em 3D" no detalhe alternam manualmente. Não há botão
   global de 3D. A imagem de satélite tem baixa resolução em zoom alto: para nitidez use "Ruas".

## Camadas do mapa (`/explore/map`)

Visualização dos focos (URL `plot`): `points` (padrão; um símbolo por detecção, clique mostra
os detalhes) ou `hex` (**H3** via `h3-js`: contagem por célula hexagonal, MODIS e VIIRS separados
no detalhe; resolução automática pelo zoom, `lib/utils/hex.ts`; cor por contagem; lista dos
hexágonos com mais focos como alternativa por teclado). Os hexágonos contam só os pontos
carregados (o mock limita a ~2,5 mil); com dados reais a agregação H3 deve vir do backend.
No modo `hex` os pontos ◆ ● aparecem por cima das células a partir do zoom 5 (`dots=false` os
desliga); clicar num ponto abre o detalhe da detecção e clicar na célula abre a contagem, um de
cada vez. Os detalhes da seleção aparecem no topo do painel lateral.

Mapa base (URL `base`): `satellite` (NASA Blue Marble), `vegetation` (satélite + NDVI MODIS 8 dias,
GIBS) e `illustrated` (países em cinza mais escuro sobre oceano cinza claro, fronteiras brancas;
dados Natural Earth em `public/data/`, só os maiores países têm divisões internas).
Sobreposição: `heat=true` (densidade das detecções, ponderada por FRP quando existe; com dados
agregados usa o centro das células; não é temperatura medida). Não há camada de temperatura (foi
removida a pedido do time). Vegetação usa imagens GIBS com a data do fim do período limitada a 3 dias atrás
(`imageryDateFor`); legendas usam as paletas oficiais (`lib/map-layers.ts`). O worker do MapLibre
é copiado para `public/` por `scripts/copy-maplibre-worker.mjs`.

O mapa do **dia no calendário** (`DayLiveMap`) é o mesmo do mapa normal: com a API real faz a mesma consulta
(blocos, área visível, resolução fina ao aproximar, `areas`, `heat`, `base` da URL), só que para um dia.

## Dados (mock x API)

Sem `NEXT_PUBLIC_API_URL`, `lib/api/mock-detections.ts` e `mock-stats.ts` geram dados
**simulados** determinísticos (sempre sinalizados na UI; em dev `?mock=error` / `?mock=empty`
simulam falha e vazio). Mapa e estatísticas usam as mesmas contagens.

Com `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v2` (prefixo `/api/v2` incluso; na `main` do back a `/api/v1` é a API antiga por pontos e **não serve** a este front; `.env.local`,
exemplo em `.env.example`; reiniciar o `npm run dev` ao mudar) usa a API Spring Boot real
(`fire-atlas-api`, branch `main`, PostGIS na porta **5433** via `docker compose up -d`; carga: `ingest-gold` ou `scripts/atualizar.sh`).
A fonte é a **camada gold** do data lake (Delta Lake `gold/map_grid`): uma linha por **célula H3, dia e
sensor**, já agregada. **Não há focos individuais**: com a API real o mapa é só hexágonos H3
(`DetectionsResponse.grid`), sem pontos, sem lista de detecções e sem `matchId`. Tipos do contrato em
`types/api.ts`; `lib/api/adapters.ts` traduz para os tipos da UI.
- Região: a API não aceita `bbox` (400), só `cells` (índices H3 em hexadecimal). `lib/utils/h3-region.ts`
  converte a área em células na resolução mais fina **importada** que caiba em 380 células (a URL passa
  de ~8 KB com ~450 e o Tomcat devolve 400; o teto de 2000 da API é inalcançável por GET). Áreas grandes
  usam resolução menor (Brasil → 2, mundo → 0); a região vira a união dos hexágonos (aproximação).
- Zoom progressivo (só com API real e sem área desenhada): o mapa consulta a **área visível** (`onViewport`
  do `FireMap`, `hooks/use-query-area.ts` + `lib/utils/viewport-area.ts`): espera 350 ms parados, amplia 25%
  e só refaz a consulta ao sair da área ou aproximar bastante. A API devolve hexágonos mais finos quanto
  menor a área (mundo ~180 km de aresta, continente ~70 km, estado ~10 km, região de ~3° ~3,7 km com res 6).
  Na resolução mais fina importada (`DetectionGrid.maxResolution`) o mapa mostra o aviso "Nível mais fino disponível". Com a câmera inclinada (3D) a área é calculada pelo centro e zoom (`flatViewport`), não por `getBounds()` (que inclui o horizonte). Trocar de região
  volta na hora para a região. O mapa de calor usa o centro das células (peso √contagem) e baixa a
  opacidade dos hexágonos; a cor dos hexágonos é **logarítmica** (poucas células extremas não apagam o resto).
- Áreas grandes são consultadas em **blocos** (`lib/utils/tiles.ts`: ~40° por bloco, no máximo 12, em
  paralelo); cada bloco recebe resolução mais fina da API e o resultado é unido sem repetir células
  (`mergeDetections`; resolução = a menor entre os blocos). Dois continentes: ~365 km → ~52 km de largura.
- Áreas de calor (URL `areas=0|25|10|5`, só com dados agregados): `lib/utils/hot-areas.ts` pega as X% de
  células mais intensas, junta as vizinhas (`gridDisk`) e contorna cada mancha (`cellsToMultiPolygon`); o
  `FireMap` desenha contorno branco e esmaece as demais; `HotAreaList` lista as maiores (alternativa textual).
- Resoluções e datas disponíveis vêm de `/meta/sources` (`lib/api/coverage.ts`, cache de 1 min; o
  `sourceKey` traz `resolution=N`; use `minDate/maxDate`, não o `periodEnd` declarado).
- Mapa: `/detections?cells&start&end&sensor&zoom=3`; a API escolhe a resolução de saída (células grossas
  de entrada devolvem hexágonos finos) e informa `resolution`. Máx. 366 dias (400 com `detail` da API).
- Estatísticas: `/compare` + `/timeseries` + `/rankings/cells` (ranking e regiões críticas) +
  `/compare/historical` (histórico/anomalia: só com 3+ anos anteriores, senão "Indisponível"). Ranking e
  histórico são opcionais (falha neles não derruba o painel). "Períodos críticos" = dias consecutivos com
  `unusual` do `/timeseries`. Dia sem dado vira `null` na série.
- Calendário: `/calendar` (mês) e, no detalhe do dia, `/detections` de um dia (grade) + `/calendar`
  (contagem exata). A API devolve 0 tanto para "sem foco" quanto para "sem dado": a cobertura decide
  (`unavailable` fora de `minDate..maxDate`). **Passagem diurna/noturna não existe** na gold: o seletor
  "Horário" só oferece "Dia inteiro".
- Previsão: a branch gold não tem `/predictions` (500); a página só existe com a feature flag.
- Erros 4xx mostram o `detail` da API; 5xx/rede permitem "Tentar novamente".
- O banco só tem o que foi importado (`scripts/importar.sh INICIO FIM RESOLUCOES` na API; `/meta/coverage`).
  Hoje: 2026, resoluções 0–6 (a 6 é o máximo que a API aceita), global; o banco tem ~6,4 GB. Rodar `ANALYZE daily_h3` depois de cargas grandes. Sem anos anteriores não há comparação histórica.

Regras de não-invenção: FRP, ranking, períodos críticos, harmonizado e correspondências
só aparecem quando a API os fornece (senão "Indisponível"). Correspondência entre sensores
vem só da harmonização validada (`matchId`). A previsão nunca é simulada: sem serviço,
mostra indisponibilidade. Ausência de ponto nunca é apresentada como ausência de fogo.
Os 8 focos do globo da home são ilustrativos.

## Estrutura de pastas

```
src/
  app/            # SÓ rotas e layouts (finos). Lógica vive em features/.
  features/       # Um diretório por domínio: home, map, calendar, stats, forecast, filters
    <feature>/components/   # componentes exclusivos da feature
  components/
    ui/           # primitivos (Button, Select, Tabs…) sem regra de negócio
    layout/       # Header, Nav, Shell
    feedback/     # Loading, ErrorState (com retry), EmptyState
  lib/api/        # cliente HTTP do Spring Boot + funções por recurso
  lib/utils/
  hooks/          # hooks genéricos
  providers/      # React Query, etc.
  types/          # tipos compartilhados (DTOs da API)
  config/         # navigation.ts, constantes
public/textures/  # texturas do globo
```

Convenções: arquivos `kebab-case.tsx`, componentes `PascalCase`, imports via
alias `@/`. Server Components por padrão; `"use client"` só onde há
interação (globo, mapa, filtros). Features não importam umas das outras —
só de `components/`, `lib/`, `hooks/`, `types/` (exceções já existentes: previsão reutiliza o
mapa e o `Unavailable` de stats). Filtros: `lib/filters.ts` + `hooks/use-filters.ts`.
**Não escrever comentários no código** (pedido do time); nomes claros e CLAUDE.md bastam.

## Filtros (barra + modal)

A barra do `explore/layout` (`features/filters/components/filter-bar.tsx`) mostra o botão **"Filtros (N)"**, um
resumo dos três filtros (sensores, local, período; cada um ativo tem ✕ para remover) e "Limpar filtros".
O botão abre o modal (`filter-modal.tsx`, sobre `components/ui/dialog.tsx`: foco preso, Esc, clique fora, rolagem
travada, vira gaveta de baixo no celular). O modal trabalha com um **rascunho** e só grava na URL em "Aplicar":
Sensores · Local (busca + continentes, Brasil e estados) · Área personalizada ("Desenhar no mapa" só na rota do
mapa, via `providers/draw-mode.tsx`; ou "Digitar coordenadas", validadas) · Período (atalhos em
`lib/filter-presets.ts`: 7 dias = padrão e **não grava datas**, 30 dias, este mês, este ano, personalizado; máx. 366
dias). Não há mais formulário de área nem "Áreas de calor" na barra lateral do mapa (o desenho de áreas de calor
só existe via `areas=` na URL).

## Estado e filtros (RN03)

Filtros vivem na **query string da URL** (lib `nuqs`): `sensors` (modis,viirs — camadas
independentes), `from`/`to` (padrão: últimos 7 dias), `region` (id de `config/regions.ts`,
o mesmo parâmetro do calendário), `bbox` (`oeste,sul,leste,norte`, área personalizada,
validada em `lib/utils/bbox.ts`, tem prioridade sobre `region`) e `date` (dia escolhido no
calendário, usado como período quando `from/to` não existem). "Limpar filtros" restaura o padrão.
Sobrevivem à navegação, são compartilháveis e funcionam com o botão voltar; links do menu
preservam a query string. Dados do servidor: **TanStack Query** (`hooks/use-detections.ts`).

## Stack

Next.js (App Router, `src/`), React, TypeScript, Tailwind v4, Three.js +
`@react-three/fiber` + `drei` (globo), MapLibre GL (mapa, carregado só no cliente via
`dynamic`), TanStack Query, nuqs, Vitest. Gráficos são SVG próprio (sem biblioteca).

## Design

Tema espacial dark-first. Tokens em `src/app/globals.css` (`@theme`).
Fontes (`next/font`): **Space Grotesk** (títulos), **Inter** (texto),
**JetBrains Mono** (dados/números/coordenadas). Botão vermelho = `fire-500`.
Acessibilidade: contraste WCAG AA, foco visível, `prefers-reduced-motion`,
nunca só cor (usar legenda + texto), navegação completa por teclado, link
"pular para o conteúdo" (`#conteudo`), alternativa textual ao globo.
Origem do dado sempre com cor + forma + texto (ver `map-legend.tsx`).

## Comandos

`npm run dev` · `npm run build` · `npm run lint` · `npm test` (Vitest + Testing Library)
