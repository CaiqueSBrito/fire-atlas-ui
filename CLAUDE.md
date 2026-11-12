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
| `/explore/map` | Mapa + filtros (rota padrão do ambiente principal) |
| `/explore/calendar` | Calendário de queimadas (cartas interativas, sidebar retrátil própria) — feature NASA-013 |
| `/explore/statistics` | Análises (indicadores/cartas) |
| `/explore/forecasts` | Previsões — **só existe com `NEXT_PUBLIC_FEATURE_FORECAST=true`** (404 caso contrário) |

O **calendário é uma rota própria** (`/explore/calendar`, feature `features/calendar`, com
sidebar retrátil, região e estado na URL: `month`, `date`, `region`, `time`, `view`).
A barra de filtros global (satélite/período) fica oculta nessa rota.

**Padrão:** rotas (URLs e nomes de pastas em `app/`) sempre em inglês; textos da interface em português.

`src/app/explore/layout.tsx` é o shell compartilhado (`SiteHeader` + filtros + `children`).
Cada página renderiza o próprio `<main id="conteudo">` (o calendário é largura total;
as demais usam `PageSection`).
`explore/loading.tsx` e `explore/error.tsx` cobrem todas as seções (RN05). Nesta versão do
Next o error boundary recebe **`retry`** (não `reset`).

## Dados (mock x API)

Sem `NEXT_PUBLIC_API_URL`, `src/lib/api/fires.ts` gera dados **mock** (e em dev
`?mock=error` / `?mock=empty` simulam falha e vazio). Com a variável, chama
`GET /fires/summary?satellite=&from=&to=` — **contrato ainda não combinado com o backend**.
Os 8 focos do globo da home são ilustrativos, não dados reais.

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
só de `components/`, `lib/`, `hooks/`, `types/`. Filtros: `lib/filters.ts` + `hooks/use-filters.ts`.

## Estado e filtros (RN03)

Filtros (período, satélite MODIS/VIIRS/harmonizado, região, etc.) vivem na
**query string da URL** (lib `nuqs`) — sobrevivem à navegação entre seções,
são compartilháveis e funcionam com o botão voltar. Links do menu devem
preservar a query string. Dados do servidor: **TanStack Query** (cache, retry,
estados de loading/error).

## Stack

Next.js (App Router, `src/`), React, TypeScript, Tailwind v4, Three.js +
`@react-three/fiber` + `drei` (globo), TanStack Query, nuqs.
A instalar quando necessário: biblioteca de mapa (MapLibre GL / react-map-gl),
biblioteca de gráficos.

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
