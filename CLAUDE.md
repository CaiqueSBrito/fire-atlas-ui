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
| `/` | Home: cabeçalho + hero (globo + botão vermelho) + seções (desafio, proposta, dados, time, FAQ) + rodapé |
| `/explore` | Redireciona para `/explore/map` |
| `/explore/map` | Mapa interativo MapLibre + base NASA GIBS, camadas MODIS ◆ / VIIRS ●, pontos ou hexágonos H3, área por desenho ou coordenadas, detalhes da detecção (NASA-012) |
| `/explore/calendar` | Calendário de queimadas: atividade harmonizada por dia, barras por faixa de temperatura de brilho, mapa do dia e resumo do mês — feature NASA-013 |
| `/explore/statistics` | Dashboard: indicadores, série temporal, histórico/anomalia, ranking e períodos críticos (NASA-014) |
| `/explore/forecasts` | Previsões (NASA-015): relatório no padrão das Análises — indicadores da região, tabela das células de maior probabilidade de fogo em 7 dias e metadados |

O **calendário é uma rota própria** (`/explore/calendar`, feature `features/calendar`; estado na URL: `month`,
`date`, `region`, `bbox`). A barra de filtros global fica oculta nessa rota. Layout (design system da home,
`.superdesign/design-system.md`): chips de região + seletor de mês e "Hoje"; à esquerda o mapa do dia (`DayMap`) e as
barras do mês (`MonthBars`: uma barra por dia, empilhada por faixa de temperatura, da mais fria embaixo à mais
quente; dia sem dado tracejado); à direita o "Dia selecionado" (`DayPanel`: valor harmonizado, satélites,
lista por temperatura) e o "Resumo do mês" (`MonthSummary`). Sem `date` na URL abre hoje, ou o último dia com dado.

**Padrão:** rotas (URLs e nomes de pastas em `app/`) sempre em inglês; textos da interface em português.

`src/app/explore/layout.tsx` é o shell compartilhado (`SiteHeader` + filtros + `children`).
Cada página renderiza o próprio `<main id="conteudo">` (o calendário monta o próprio container `max-w-7xl`;
as demais usam `PageSection`).
`explore/loading.tsx` e `explore/error.tsx` cobrem todas as seções (RN05). Nesta versão do
Next o error boundary recebe **`retry`** (não `reset`).

## Fluxo de exploração (globo → mapa 2D → foco inclinado)

1. **Home:** só o botão principal "Explorar focos de calor" e o menu do topo levam ao mapa (pedido do time).
   O globo 3D gira e, ao passar o mouse, mostra o nome do continente (`continentAt`), mas **não é clicável**.
   Não há atalhos por região, botões de Calendário/Análises no hero nem link "Mapa" no rodapé.
2. **Mapa (`/explore/map`) começa como globo 3D** (MapLibre `vertical-perspective`, `GLOBE_PROJECTION`)
   quando a região é `world` e não há `bbox`: passar o mouse mostra "Clique para explorar:
   <continente>"; clicar num continente (`continentAt`) grava `region=<id>` na URL e a câmera faz
   zoom animado até a região, achatando para o mapa 2D (projeção interpola para mercator entre os
   zooms 1,8 e 2,4). Os continentes são regiões em `config/regions.ts`, também no filtro e no
   calendário. Vindo da home, o mapa já começa no globo e faz o voo (`introFly`).
   No 2D (mercator), depois do voo, o zoom mínimo vira `flatMinZoom(largura)` (o mundo ocupa a largura da tela uma vez,
   sem cópias lado a lado); recalcula ao redimensionar e volta a 0 no globo. Não use `setMaxBounds`/`renderWorldCopies`
   aqui: com a projeção que interpola globo→mercator o MapLibre 6 quebra ("Cannot read properties of null").
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

**Mapa principal → calendário (mesmo lugar):** o `MapExplorer` grava em `sessionStorage` (`lib/utils/map-place.ts`,
chave `fire-atlas:map-place`) a região e o lugar atual: o hexágono selecionado (`hexBbox`), senão a detecção selecionada,
senão a área visível (ou a área desenhada). O botão "Calendário" do mapa leva esse lugar em `bbox`; vindo pelo menu, o
`CalendarView` usa o lugar lembrado se a região for a mesma (`useSyncExternalStore`). O `bbox` da URL tem prioridade e trocar
a região no calendário o descarta. O mapa do dia fica fixo nesse lugar ao trocar de dia.

O mapa do **dia no calendário** (`DayLiveMap`) é o mesmo do mapa normal: com a API real faz a mesma consulta
(blocos, área visível, resolução fina ao aproximar, `areas`, `heat`, `base` da URL), só que para um dia. Sem grade
(mock) desenha pontos; sem WebGL desenha o `RegionPlot` esquemático com os mesmos dados.

## Dados (mock x API)

Sem `NEXT_PUBLIC_API_URL`, `lib/api/mock-detections.ts` e `mock-stats.ts` geram dados
**simulados** determinísticos (sempre sinalizados na UI; em dev `?mock=error` / `?mock=empty`
simulam falha e vazio). Mapa e estatísticas usam as mesmas contagens.

Com `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v2` (prefixo `/api/v2` incluso; na `main` do back a `/api/v1` é a API antiga por pontos e **não serve** a este front; `.env.local`,
exemplo em `.env.example`; reiniciar o `npm run dev` ao mudar) usa a API Spring Boot real
(backend `fire-atlas-api`, PostGIS na porta **5433** via `docker compose up -d`). A camada gold é consultada direto no
S3 pelo Athena; não existe mais importação da gold, `ingest-gold` nem sincronização ao subir a API.
A fonte é a **camada gold** do data lake (Delta Lake `gold/map_grid`): uma linha por **célula H3, dia e
sensor**, já agregada. **Não há focos individuais**: com a API real o mapa é só hexágonos H3
(`DetectionsResponse.grid`), sem pontos, sem lista de detecções e sem `matchId`. Tipos do contrato em
`types/api.ts`; `lib/api/adapters.ts` traduz para os tipos da UI.
- Região: a API não aceita `bbox` (400), só `cells` (índices H3 em hexadecimal). `lib/utils/h3-region.ts`
  converte a área em células na resolução mais fina **disponível** (gold: 0–6) que caiba em 380 células (a URL passa
  de ~8 KB com ~450 e o Tomcat devolve 400; o teto de 2000 da API é inalcançável por GET). Áreas grandes
  usam resolução menor (Brasil → 2, mundo → 0); a região vira a união dos hexágonos (aproximação).
- Zoom progressivo (só com API real e sem área desenhada): o mapa consulta a **área visível** (`onViewport`
  do `FireMap`, `hooks/use-query-area.ts` + `lib/utils/viewport-area.ts`): espera 350 ms parados, amplia 25%
  e só refaz a consulta ao sair da área ou aproximar bastante. A API devolve hexágonos mais finos quanto
  menor a área (mundo ~180 km de aresta, continente ~70 km, estado ~10 km, região de ~3° ~3,7 km com res 6).
  Na resolução mais fina disponível (`DetectionGrid.maxResolution`) o mapa mostra o aviso "Nível mais fino disponível". Com a câmera inclinada (3D) a área é calculada pelo centro e zoom (`flatViewport`), não por `getBounds()` (que inclui o horizonte). Trocar de região
  volta na hora para a região. O mapa de calor usa o centro das células (peso √contagem) e baixa a
  opacidade dos hexágonos; a cor dos hexágonos é **logarítmica** (poucas células extremas não apagam o resto).
- Áreas grandes são consultadas em **blocos** (`lib/utils/tiles.ts`: ~40° por bloco, no máximo 12, em
  paralelo); cada bloco recebe resolução mais fina da API e o resultado é unido sem repetir células
  (`mergeDetections`; resolução = a menor entre os blocos). Dois continentes: ~365 km → ~52 km de largura.
- Áreas de calor (URL `areas=0|25|10|5`, só com dados agregados): `lib/utils/hot-areas.ts` pega as X% de
  células mais intensas, junta as vizinhas (`gridDisk`) e contorna cada mancha (`cellsToMultiPolygon`); o
  `FireMap` desenha contorno branco e esmaece as demais; `HotAreaList` lista as maiores (alternativa textual).
- Datas disponíveis vêm de `/meta/coverage` (`lib/api/coverage.ts`, cache compartilhado de 10 min); o retorno é uma
  lista por sensor com `minDate`, `maxDate` e `detections`. `/meta/sources` foi removido. As resoluções da gold são
  0–6, independentemente de importações. O histórico pode ser consultado desde 2000; ausência de dado não é zero.
- **Mapa (normal e do dia no calendário) = atividade harmonizada por célula**: `fetchDetections` chama
  `/activity/cells?cells&start&end&zoom` (rota do back na branch `feat/activity-cells`, já no Athena; `harmonized_cells`),
  em blocos como antes. `HexCell.count` = valor harmonizado (fracionário), `modis`/`viirs` = detecções que entraram na
  harmonização; `DetectionGrid.harmonized.unitLabel` liga os textos com unidade (detalhe, lista, legenda, total). O filtro
  de sensores não se aplica. Dia = dia local de fogo. A cor usa `colorFloor`: com valores < 1 a escala log começa no menor
  valor (no mínimo 1/1000 do máximo); contagens inteiras continuam com base 1.
- `/detections?cells&start&end&sensor&zoom=3` (contagem por sensor, também usada pela home); a API escolhe a resolução de saída (células grossas
  de entrada devolvem hexágonos finos) e informa `resolution`. Máx. 366 dias (400 com `detail` da API).
- Estatísticas: `/compare` + `/timeseries` + `/rankings/cells` (ranking e regiões críticas) +
  `/compare/historical` (histórico/anomalia: só com 3+ anos anteriores, senão "Indisponível"). Ranking e
  histórico são opcionais (falha neles não derruba o painel). "Períodos críticos" = dias consecutivos com
  `unusual` do `/timeseries`. Dia sem dado vira `null` na série.
- Calendário (atividade **harmonizada**, gold/harmonized): `/activity/calendar` (mês: `harmonized`, `contributing`,
  `hasData`, `basis` e `temperature` por dia), `/activity/anomaly` (mês × mediana dos anos anteriores, `years=5`;
  sem 3 anos: "Indisponível") e `/activity/availability` (satélites que contribuíram no dia; vale para o mundo).
  Região: continentes por `continent` (nome em inglês), Brasil por `country=BR`, mundo e estados por `cells`
  (a API recusa `bbox`). Unidade: **células ativas equivalentes ao MODIS Aqua, não é nº de focos** (mostrar
  `meta.unitLabelPt`). `hasData=false` = sem dado (nunca zero). `temperature` = 7 faixas de temperatura de brilho
  (`lt320`, `320`…`350`, `ge360`, `none`) que somam `harmonized`; vem `null` enquanto o lake não tiver as colunas
  `harmonized_t_*` (a UI mostra a barra de uma cor e "Faixas de temperatura indisponíveis"). `basis`: `viirs` =
  VIIRS I-4, `aqua`/`terra` = MODIS 21/22 (escalas diferentes). Não há MODIS × VIIRS separados no calendário.
- Análises: o painel `HarmonizedMonthlyPanel` usa `/activity/monthly` (últimos 12 meses até o fim do período, região por
  continente/país/células; área desenhada vai por `cells`). Barras por mês: mês em andamento tracejado, mês sem dado só
  contorno (nunca zero), tabela equivalente e unidade obrigatória. Sem API não aparece.
- Previsão no mapa (URL `forecast=true`, interruptor "Previsão de fogo (7 dias)" em Sobreposições, só com API):
  `useMapForecast` chama `/forecast` na área visível com `limit=2000` (`MAP_FORECAST_LIMIT`). O `FireMap` desenha os
  hexágonos res 6 em vermelho tracejado (cor pela probabilidade, `FORECAST_RAMP`) a partir do zoom 5 e pontos no centro com
  zoom afastado. Legenda com emissão e o grupo "Previsão" no painel (aviso "PREVISÃO — não são detecções observadas" e as
  10 maiores probabilidades, `ForecastLayerList`). Indisponível/erro aparecem no grupo; nunca simula.
- Previsão: `/forecast?cells&limit=2000` (`MAP_FORECAST_LIMIT`; gold/forecast, célula H3 res 6, emissão mais recente). A API
  devolve `summary` (células, ativas, maior e média da probabilidade na região inteira) e as células ordenadas, com cidade
  mais próxima e país de `h3_places`. Só a região dos filtros vale; período e sensores não se aplicam. Sem emissão
  publicada: "Indisponível". A página mostra o **mapa de risco** (`features/forecast/components/forecast-map.tsx`: `FireMap`
  com `forecastCells`, pontos no zoom afastado e hexágonos vermelhos tracejados ao aproximar, escala `FORECAST_RAMP`), a lista das
  10 maiores (clicar aproxima o mapa e abre o detalhe) e a tabela das 100 maiores recolhida em `<details>` como alternativa
  em texto. Sem WebGL o quadro do mapa vira aviso e a lista/tabela continuam. Formatadores em `features/forecast/format.ts`.
- HTTP: timeout de **45 s**, cobrindo cabeçalhos e corpo; a API pode consumir 30 s por consulta Athena. O `detail`
  RFC 7807 também é mostrado no 503. Rede, timeout, 429 e 5xx (exceto 501) permitem retry; 400/404/501 não.
  React Query faz no máximo 2 novas tentativas com backoff (600 ms, 1,2 s), mantém staleTime de 5 min e não refaz
  consultas ao focar a janela. `AbortSignal` cancela chamadas antigas quando os filtros/viewport mudam; isso não
  garante cancelamento de uma execução já iniciada no Athena.
- Cache: HTTP `Cache-Control` da API é preservado (sem `no-store`); células H3 são ordenadas e as chaves React Query
  usam os conjuntos de células efetivamente consultados, evitando consultas novas por pequenas mudanças do bbox.
- Período padrão continua curto (7 dias); o limite de 366 dias também é validado em URLs diretas. Calendário mantém
  acesso ao ano 2000. `truncated` gera aviso visível no mapa principal e no mapa diário; previsões já mostram o top-N.
- Estados de carregamento existentes foram preservados, sem novos spinners/skeletons nesta adaptação ao Athena.

Regras de não-invenção: FRP, ranking, períodos críticos, harmonizado e correspondências
só aparecem quando a API os fornece (senão "Indisponível"). Correspondência entre sensores
vem só da harmonização validada (`matchId`). A previsão nunca é simulada: sem serviço,
mostra indisponibilidade. Ausência de ponto nunca é apresentada como ausência de fogo.
Home: com a API real, o globo mostra as 12 células com mais detecções dos últimos 7 dias com dado (`lib/api/home.ts`,
`fetchTopHotspots`) e a faixa `LiveStats` mostra a soma global dos últimos 30 dias por sensor; sem API ou com falha, a faixa
some e o globo volta aos 8 pontos **ilustrativos** (a legenda diz qual é o caso). Nos testes, simule falha com função comum
no `vi.mock` (um `vi.fn` que rejeita é registrado pelo Vitest como erro do teste).

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
só de `components/`, `lib/`, `hooks/`, `types/` (exceção já existente: previsão reutiliza o
`Unavailable` de stats). Filtros: `lib/filters.ts` + `hooks/use-filters.ts`.
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

Docker: `docker compose up -d --build` → http://localhost:3000 (`Dockerfile` multi-stage com
`output: "standalone"`). As variáveis `NEXT_PUBLIC_*` são **fixadas no build** (build args do
`docker-compose.yml`; padrão `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v2`): mudar a URL exige
rebuild. A URL é usada pelo navegador, então `localhost:8080` é a API rodando na máquina do usuário,
não dentro do container. Para usar mock: `NEXT_PUBLIC_API_URL= docker compose up -d --build`.

## Time (home)

`features/home/components/team.tsx`: seção "Nosso time" (entre Dados e FAQ) com um card por pessoa (foto em
`public/team/`, nome e função; a Ana tem o selo "Team Owner"). Para trocar foto, mantenha o nome do arquivo e ajuste `focus`
(`object-position`) para centralizar o rosto. O logo do cabeçalho (`components/layout/logo.tsx`) usa gradiente de fogo.
