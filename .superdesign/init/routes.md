# Routes

Roteamento por arquivos do Next.js App Router (`src/app`). URLs em inglês, textos em português. Estado de filtros na query string (nuqs).

| URL | Arquivo | Layout | Conteúdo |
|---|---|---|---|
| `/` | `src/app/page.tsx` | root | Home: SiteHeader + Hero (globo 3D + botão vermelho 'Explorar focos de calor' + RegionLinks) + O desafio + O que a plataforma propõe + De onde vêm os dados + FAQ + SiteFooter |
| `/explore` | `src/app/explore/page.tsx` | explore | Redireciona para /explore/map |
| `/explore/map` | `src/app/explore/map/page.tsx` | explore | Mapa MapLibre com camadas MODIS/VIIRS, hexágonos H3, painel lateral de camadas |
| `/explore/calendar` | `src/app/explore/calendar/page.tsx` | explore (sem barra de filtros) | Calendário de queimadas: sidebar retrátil 'Baralho do mês' (grade de cartas por dia, navegação de mês, resumo) + palco (estado vazio com leque de cartas OU 'Carta do dia' com seletores Local/Data/Horário, carta dourada de registro e painel 'Mapa de focos') |
| `/explore/statistics` | `src/app/explore/statistics/page.tsx` | explore | Dashboard de indicadores, série temporal, histórico/anomalia, ranking |
| `/explore/forecasts` | `src/app/explore/forecasts/page.tsx` | explore | Previsões: indicadores + tabela de células com maior probabilidade de fogo |

Layouts: `src/app/layout.tsx` (raiz) → `src/app/explore/layout.tsx` (shell de exploração). Erros/carregamento: `src/app/explore/{error,loading}.tsx`, `src/app/explore/calendar/{error,loading}.tsx`.

## Arquivos de rota

### `src/app/page.tsx`
```tsx
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AboutChallenge } from "@/features/home/components/about-challenge";
import { DataSources } from "@/features/home/components/data-sources";
import { Faq } from "@/features/home/components/faq";
import { Hero } from "@/features/home/components/hero";
import { HowItWorks } from "@/features/home/components/how-it-works";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1}>
        <Hero />
        <AboutChallenge />
        <HowItWorks />
        <DataSources />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
```

### `src/app/explore/page.tsx`
```tsx
import { redirect } from "next/navigation";

export default function ExploreIndex() {
  redirect("/explore/map");
}
```

### `src/app/explore/calendar/page.tsx`
```tsx
import { Suspense } from "react";
import { CalendarSkeleton } from "@/features/calendar/components/calendar-skeleton";
import { CalendarView } from "@/features/calendar/components/calendar-view";

export default function Page() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarView />
    </Suspense>
  );
}
```

### `src/app/explore/map/page.tsx`
```tsx
import { MapExplorer } from "@/features/map/components/map-explorer";

export default function MapPage() {
  return <MapExplorer />;
}
```

### `src/app/explore/statistics/page.tsx`
```tsx
import { StatsDashboard } from "@/features/stats/components/stats-dashboard";

export default function StatisticsPage() {
  return <StatsDashboard />;
}
```

### `src/app/explore/forecasts/page.tsx`
```tsx
import { ForecastView } from "@/features/forecast/components/forecast-view";

export default function ForecastsPage() {
  return <ForecastView />;
}
```

### `src/app/explore/calendar/loading.tsx`
```tsx
import { CalendarSkeleton } from "@/features/calendar/components/calendar-skeleton";

export default function Loading() {
  return <CalendarSkeleton />;
}
```

### `src/app/explore/calendar/error.tsx`
```tsx
"use client"; // Error boundaries precisam ser Client Components

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";

// Nesta versão do Next o boundary recebe `retry` (re-busca e re-renderiza).
export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="conteudo" className="grid flex-1 place-items-center p-8">
      <div className="w-full max-w-md">
        <ErrorState
          title="Não foi possível carregar o calendário"
          message="Ocorreu um erro inesperado. Você pode tentar novamente."
          onRetry={retry}
        />
      </div>
    </main>
  );
}
```

