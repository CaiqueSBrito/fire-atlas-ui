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
| `/explore/map` | Mapa interativo MapLibre + base NASA GIBS, camadas MODIS ◆ / VIIRS ●, área por desenho ou coordenadas, detalhes da detecção (NASA-012) |
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

## Camadas do mapa (`/explore/map`)

Mapa base (URL `base`): `satellite` (NASA Blue Marble), `vegetation` (satélite + NDVI MODIS 8 dias,
GIBS) e `illustrated` (países em cinza mais escuro sobre oceano cinza claro, fronteiras brancas;
dados Natural Earth em `public/data/`, só os maiores países têm divisões internas).
Sobreposições: `heat=true` (densidade das detecções, ponderada por FRP quando existe; não é
temperatura medida) e `temp=true` (temperatura máxima do ar do dia, **Open-Meteo**, CC BY 4.0,
sem chave). A temperatura é um campo suave (grade de até 400 pontos, interpolação bicúbica,
`lib/utils/temperature-field.ts`) desenhado num canvas e recortado só sobre os países
(`temperature-image.ts`), com fronteiras finas por cima. Grade com margem de 30% além da área,
cache de 30 min; o limite gratuito é ~600 chamadas/min (cada ponto conta): erro 429 mostra
mensagem e "Tentar novamente", sem retentativa automática. Datas antigas (>90 dias) usam a API de
arquivo. Vegetação usa imagens GIBS com a data do fim do período limitada a 3 dias atrás
(`imageryDateFor`); legendas usam as paletas oficiais (`lib/map-layers.ts`). O worker do MapLibre
é copiado para `public/` por `scripts/copy-maplibre-worker.mjs`.

## Dados (mock x API)

Sem `NEXT_PUBLIC_API_URL`, `lib/api/mock-detections.ts` e `mock-stats.ts` geram dados
**simulados** determinísticos (sempre sinalizados na UI; em dev `?mock=error` / `?mock=empty`
simulam falha e vazio). Mapa e estatísticas usam as mesmas contagens. Com a variável, chama
`GET /detections`, `/stats` e `/forecast` (`sensors, from, to, bbox` / `region, bbox`) —
**contratos propostos, ainda não combinados com o backend** (tipos em `types/detections|stats|forecast.ts`).

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
