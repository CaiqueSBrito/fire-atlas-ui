Page: Fire Atlas — Calendário: Mapa e Linha do Tempo

```html
<!DOCTYPE html><html lang="pt-BR" class="h-full antialiased" style="--font-space-grotesk: 'Space Grotesk', system-ui, sans-serif; --font-fustat: 'Fustat', system-ui, -apple-system, 'Segoe UI', sans-serif; --font-jetbrains: 'JetBrains Mono', ui-monospace, monospace;"><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fire Atlas — Calendário de Atividade</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Fustat:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;700&amp;family=Space+Grotesk:wght@500;700&amp;display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            space: {
              950: "#04060c",
              900: "#0a0f1e",
              800: "#121a31",
              600: "#2a3558",
            },
            ink: {
              100: "#f2f5ff",
              300: "#aab4d4",
            },
            fire: {
              500: "#e5242b",
              400: "#ff4a3d",
            },
            ember: {
              400: "#ffb02e",
            },
            earth: {
              400: "#3aa6ff",
            },
            focus: {
              ring: "#ffd166",
            }
          },
          fontFamily: {
            sans: ["var(--font-fustat)"],
            display: ["var(--font-space-grotesk)"],
            mono: ["var(--font-jetbrains)"],
          },
          fontSize: {
            caption: "0.75rem",
            small: "0.875rem",
            body: "1rem",
            h2: "clamp(1.5rem, 1.2rem + 1.2vw, 2.25rem)",
            h1: "clamp(2rem, 1.4rem + 2.5vw, 3.5rem)",
            display: "clamp(2.5rem, 1.5rem + 5vw, 5.5rem)",
          }
        }
      }
    }
  </script>
  <style>
    body {
      background-color: #04060c;
      color: #f2f5ff;
      font-family: 'Fustat', sans-serif;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="min-h-screen bg-space-950 flex flex-col">
    <!-- Header -->
    <header class="border-b border-space-600 bg-space-950 z-40">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2 sm:px-10">
        <a href="#" id="nav-home" class="inline-flex items-center gap-2 rounded-md font-display text-lg font-bold tracking-tight text-ink-100">
          <span aria-hidden="true" class="h-3 w-3 rounded-full bg-fire-500 shadow-[0_0_12px_#ff4a3d]"></span>
          Fire Atlas
        </a>
        <div class="order-last w-full md:order-none md:w-auto">
          <nav aria-label="Seções principais" class="overflow-x-auto">
            <ul class="flex items-center gap-1">
              <li><a href="#" id="nav-link-inicio" class="inline-flex h-12 items-center rounded-full px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-300 hover:bg-space-800 hover:text-ink-100 transition-colors duration-200">Início</a></li>
              <li><a href="#" id="nav-link-mapa" class="inline-flex h-12 items-center rounded-full px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-300 hover:bg-space-800 hover:text-ink-100 transition-colors duration-200">Mapa</a></li>
              <li><a href="#" id="nav-link-calendario" aria-current="page" class="inline-flex h-12 items-center rounded-full px-4 text-base font-semibold leading-6 tracking-[-0.02em] bg-ember-400 text-space-950 transition-colors duration-200">Calendário</a></li>
              <li><a href="#" id="nav-link-analises" class="inline-flex h-12 items-center rounded-full px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-300 hover:bg-space-800 hover:text-ink-100 transition-colors duration-200">Análises</a></li>
              <li><a href="#" id="nav-link-previsoes" class="inline-flex h-12 items-center rounded-full px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-300 hover:bg-space-800 hover:text-ink-100 transition-colors duration-200">Previsões</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main id="conteudo" class="flex-1 py-10">
      
      <!-- Map Hero Section -->
      <section class="mx-auto max-w-7xl px-6 sm:px-10">
        <div class="relative w-full overflow-hidden rounded-2xl border border-space-600 bg-[#e5e5e5] aspect-[21/9] min-h-[400px]">
          <!-- Base Map Placeholder -->
          <div class="absolute inset-0 bg-[#f2f5ff]">
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg" class="w-full h-full object-cover opacity-50" alt="Mapa mundial">
            <!-- Hexagon overlays simulating H3 cells -->
            <div class="absolute w-[8%] h-[15%] bg-[#ff4a3d] blur-[8px] opacity-60 rounded-full left-[22%] top-[35%]"></div>
            <div class="absolute w-[15%] h-[25%] bg-[#ffb02e] blur-[12px] opacity-80 rounded-full left-[28%] top-[45%]"></div>
            <div class="absolute w-[10%] h-[15%] bg-[#e5242b] blur-[10px] opacity-70 rounded-full left-[55%] top-[25%]"></div>
            
            <!-- Map Controls (Standard to Map) -->
            <div class="absolute top-5 right-5 flex flex-col rounded-lg shadow-md bg-white border border-gray-300 overflow-hidden text-black">
              <button class="px-3 py-2 border-b border-gray-300 text-lg font-bold hover:bg-gray-100">+</button>
              <button class="px-3 py-2 text-lg font-bold hover:bg-gray-100">−</button>
            </div>
            <div class="absolute bottom-5 left-5 bg-white/80 px-2 py-1 text-xs text-black border border-gray-400 backdrop-blur">
              5000 km
            </div>
            <div class="absolute bottom-5 right-5 bg-white/80 px-2 py-1 text-xs text-black rounded backdrop-blur">
              OpenFreeMap © OpenMapTiles Data from OpenStreetMap
            </div>
          </div>

          <!-- Overlay: Date Details Card -->
          <div class="absolute top-6 left-6 w-80 rounded-2xl border border-space-600 bg-space-900/85 p-5 shadow-2xl backdrop-blur">
            <p class="font-mono text-caption uppercase tracking-[0.2em] text-ember-400">Calendário de Queimadas</p>
            <h1 class="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-ink-100">13 de novembro de 2026</h1>
            <div class="mt-3 inline-flex items-center gap-2 rounded-full border border-space-600 bg-space-950/50 px-3 py-1 text-small text-ink-100">
              <span class="font-mono text-ember-400">●</span>
              Atividade registrada
            </div>
            <div class="mt-5 grid gap-2 font-mono text-small text-ink-100">
              <div class="flex justify-between border-b border-space-600/50 pb-2">
                <span><span class="text-ember-400 mr-1">◆</span>MODIS</span>
                <span class="font-bold">2.767</span>
              </div>
              <div class="flex justify-between border-b border-space-600/50 pb-2">
                <span><span class="text-fire-400 mr-1">●</span>VIIRS</span>
                <span class="font-bold">28.198</span>
              </div>
              <div class="flex justify-between pt-1">
                <span class="text-ink-300 font-sans">Total</span>
                <span class="font-bold text-lg">30.965</span>
              </div>
            </div>
          </div>

          <!-- Overlay: Legend Pill -->
          <div class="absolute bottom-16 right-5 inline-flex items-center gap-3 rounded-full border border-space-600 bg-space-900/85 px-4 py-2 text-caption text-ink-100 backdrop-blur">
            <span class="flex items-center gap-1"><span class="text-fire-400 font-mono">●</span> VIIRS</span>
            <span class="flex items-center gap-1"><span class="text-ember-400 font-mono">◆</span> MODIS</span>
          </div>
        </div>
      </section>

      <!-- Region & Month Controls -->
      <section class="mx-auto max-w-7xl px-6 sm:px-10 mt-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Regiões" class="flex flex-wrap gap-2">
            <button type="button" id="btn-region-mundo" aria-pressed="true" class="inline-flex h-12 items-center rounded-full border border-ember-400 bg-space-900 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ember-400 transition-colors duration-200">
              Mundo
            </button>
            <button type="button" id="btn-region-sa" class="inline-flex h-12 items-center rounded-full border border-space-600 bg-space-900 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 hover:border-ember-400 hover:text-ember-400 transition-colors duration-200">
              América do Sul
            </button>
            <button type="button" id="btn-region-na" class="inline-flex h-12 items-center rounded-full border border-space-600 bg-space-900 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 hover:border-ember-400 hover:text-ember-400 transition-colors duration-200">
              América do Norte
            </button>
            <button type="button" id="btn-region-eu" class="inline-flex h-12 items-center rounded-full border border-space-600 bg-space-900 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 hover:border-ember-400 hover:text-ember-400 transition-colors duration-200">
              Europa
            </button>
            <button type="button" id="btn-region-af" class="inline-flex h-12 items-center rounded-full border border-space-600 bg-space-900 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 hover:border-ember-400 hover:text-ember-400 transition-colors duration-200">
              África
            </button>
            <button type="button" id="btn-region-as" class="inline-flex h-12 items-center rounded-full border border-space-600 bg-space-900 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 hover:border-ember-400 hover:text-ember-400 transition-colors duration-200">
              Ásia
            </button>
            <button type="button" id="btn-region-oc" class="inline-flex h-12 items-center rounded-full border border-space-600 bg-space-900 px-4 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 hover:border-ember-400 hover:text-ember-400 transition-colors duration-200">
              Oceania
            </button>
          </nav>

          <div class="flex items-center gap-2">
            <div class="flex items-center justify-between rounded-full border border-space-600 bg-space-900 p-1">
              <button type="button" id="btn-prev-month" aria-label="Mês anterior" class="grid h-10 w-10 place-items-center rounded-full text-lg text-ink-100 transition hover:bg-space-800 hover:text-ember-400">‹</button>
              <button type="button" id="btn-month-select" class="px-4 font-display text-lg font-bold text-ink-100 hover:text-ember-400">
                Novembro de 2026
              </button>
              <button type="button" id="btn-next-month" aria-label="Próximo mês" class="grid h-10 w-10 place-items-center rounded-full text-lg text-ink-100 transition hover:bg-space-800 hover:text-ember-400">›</button>
            </div>
            <button type="button" id="btn-today" class="inline-flex h-12 items-center rounded-full border border-space-600 bg-space-800 px-6 text-base font-semibold leading-6 tracking-[-0.02em] text-ink-100 hover:border-ink-300 transition-colors">
              Hoje
            </button>
          </div>
        </div>
      </section>

      <!-- Timeline Section -->
      <section class="mx-auto max-w-7xl px-6 sm:px-10 mt-6">
        <div class="rounded-2xl border border-space-600 bg-space-800 p-6">
          <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 class="font-display text-xl font-bold tracking-tight text-ink-100">Atividade em novembro</h2>
              <p class="mt-1 text-small text-ink-300">Toque em um dia para ver no mapa</p>
            </div>
            <div class="flex items-center gap-4 text-caption text-ink-300">
              <span class="flex items-center gap-1"><span class="text-ember-400 font-mono">◆</span> MODIS</span>
              <span class="flex items-center gap-1"><span class="text-fire-400 font-mono">●</span> VIIRS</span>
              <span class="flex items-center gap-1"><span class="border-l border-dashed border-space-600 h-3 inline-block"></span> sem dado (não significa ausência de fogo)</span>
            </div>
          </header>

          <!-- Bar Chart -->
          <div class="mt-8 flex h-56 items-end justify-between gap-1">
            <!-- Days 1 to 12 (High Activity) -->
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 15%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 55%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">01</div>
              <div class="text-center font-sans text-[10px] text-ink-300">D</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 18%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 60%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">02</div>
              <div class="text-center font-sans text-[10px] text-ink-300">S</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 20%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 65%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">03</div>
              <div class="text-center font-sans text-[10px] text-ink-300">T</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 25%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 70%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">04</div>
              <div class="text-center font-sans text-[10px] text-ink-300">Q</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 30%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 70%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">05</div>
              <div class="text-center font-sans text-[10px] text-ink-300">Q</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 22%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 65%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">06</div>
              <div class="text-center font-sans text-[10px] text-ink-300">S</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 20%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 60%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">07</div>
              <div class="text-center font-sans text-[10px] text-ink-300">S</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 18%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 55%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">08</div>
              <div class="text-center font-sans text-[10px] text-ink-300">D</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 15%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 50%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">09</div>
              <div class="text-center font-sans text-[10px] text-ink-300">S</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 12%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 45%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">10</div>
              <div class="text-center font-sans text-[10px] text-ink-300">T</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 10%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 35%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">11</div>
              <div class="text-center font-sans text-[10px] text-ink-300">Q</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-full max-w-[20px] bg-ember-400 rounded-t-sm" style="height: 8%"></div>
              <div class="w-full max-w-[20px] bg-fire-400 rounded-b-sm" style="height: 30%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-ink-100">12</div>
              <div class="text-center font-sans text-[10px] text-ink-300">Q</div>
            </div>

            <!-- Day 13 (Selected) -->
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-space-950 px-2 py-1 font-mono text-[10px] text-ink-100 opacity-100 shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-10">
                13 nov · 30.965 focos
                <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-space-950"></div>
              </div>
              <div class="w-full max-w-[20px] h-full flex flex-col justify-end ring-2 ring-ember-400 ring-offset-2 ring-offset-space-800 rounded-sm">
                <div class="w-full bg-ember-400 rounded-t-sm" style="height: 6%"></div>
                <div class="w-full bg-fire-400 rounded-b-sm" style="height: 25%"></div>
              </div>
              <div class="mt-2 text-center font-mono text-[10px] font-bold text-ember-400">13</div>
              <div class="text-center font-sans text-[10px] text-ember-400">S</div>
            </div>

            <!-- Day 14 (Unavailable) -->
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">14</div>
              <div class="text-center font-sans text-[10px] text-space-600">S</div>
            </div>

            <!-- Day 15 (Today, Unavailable) -->
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="absolute -top-6 text-[10px] text-ink-300">hoje</div>
              <div class="absolute top-0 h-1.5 w-1.5 rounded-full bg-focus-ring"></div>
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] font-bold text-ink-100">15</div>
              <div class="text-center font-sans text-[10px] text-ink-300">D</div>
            </div>

            <!-- Days 16 to 30 (Unavailable) -->
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">16</div>
              <div class="text-center font-sans text-[10px] text-space-600">S</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">17</div>
              <div class="text-center font-sans text-[10px] text-space-600">T</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">18</div>
              <div class="text-center font-sans text-[10px] text-space-600">Q</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">19</div>
              <div class="text-center font-sans text-[10px] text-space-600">Q</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">20</div>
              <div class="text-center font-sans text-[10px] text-space-600">S</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">21</div>
              <div class="text-center font-sans text-[10px] text-space-600">S</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">22</div>
              <div class="text-center font-sans text-[10px] text-space-600">D</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">23</div>
              <div class="text-center font-sans text-[10px] text-space-600">S</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">24</div>
              <div class="text-center font-sans text-[10px] text-space-600">T</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">25</div>
              <div class="text-center font-sans text-[10px] text-space-600">Q</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">26</div>
              <div class="text-center font-sans text-[10px] text-space-600">Q</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">27</div>
              <div class="text-center font-sans text-[10px] text-space-600">S</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">28</div>
              <div class="text-center font-sans text-[10px] text-space-600">S</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">29</div>
              <div class="text-center font-sans text-[10px] text-space-600">D</div>
            </div>
            <div class="group relative flex flex-1 flex-col items-center justify-end h-full">
              <div class="w-[1px] border-l border-dashed border-space-600" style="height: 10%"></div>
              <div class="mt-2 text-center font-mono text-[10px] text-space-600">30</div>
              <div class="text-center font-sans text-[10px] text-space-600">S</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Summary Cards -->
      <section class="mx-auto max-w-7xl px-6 sm:px-10 mt-6 pb-14">
        <div class="grid gap-4 md:grid-cols-3">
          <article class="rounded-2xl border border-space-600 bg-space-800 p-6">
            <p class="font-mono text-caption uppercase tracking-[0.2em] text-ember-400">Dias com atividade</p>
            <div class="mt-2 flex items-baseline gap-2">
              <h3 class="font-mono text-4xl font-bold leading-none text-ink-100">13</h3>
              <span class="text-lg text-ink-300">dias</span>
            </div>
          </article>
          <article class="rounded-2xl border border-space-600 bg-space-800 p-6">
            <p class="font-mono text-caption uppercase tracking-[0.2em] text-ember-400">Pico do mês (05/11)</p>
            <div class="mt-2 flex items-baseline gap-2">
              <h3 class="font-mono text-4xl font-bold leading-none text-ink-100">135.023</h3>
              <span class="text-lg text-ink-300">focos</span>
            </div>
          </article>
          <article class="rounded-2xl border border-space-600 bg-space-800 p-6">
            <p class="font-mono text-caption uppercase tracking-[0.2em] text-ember-400">Dias indisponíveis</p>
            <div class="mt-2 flex items-baseline gap-2">
              <h3 class="font-mono text-4xl font-bold leading-none text-ink-100">17</h3>
              <span class="text-lg text-ink-300">dias</span>
            </div>
          </article>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-space-600 bg-space-900">
      <div class="mx-auto max-w-7xl px-6 py-8 sm:px-10 flex flex-col sm:flex-row justify-between items-center gap-4 text-small text-ink-300">
        <p>Projeto para a NASA Space Apps Challenge 2026.</p>
        <p class="font-mono text-caption">Dados: NASA FIRMS · MODIS + VIIRS</p>
      </div>
    </footer>
  </div>
</body></html>
```

Please reference this design and implement it into our codebase; Try to understand the structure, which part of our codebase is relevant and implement
