# Fire Atlas — Design System

Fonte de verdade visual: a **home** (`/`). Toda página nova ou repaginada segue a linguagem da home.

## Produto

Fire Atlas (NASA Space Apps 2026, desafio "Harmonization of MODIS and VIIRS Hot Spots"). Plataforma web em português
que harmoniza focos de calor NASA FIRMS (MODIS + VIIRS) num **calendário de atividade de queima**, com mapa, análises e
previsões. Público: alerta precoce/emergência, cientistas, gestores de terra, bombeiros.

Páginas: Início (globo 3D + CTA vermelho), Mapa, **Calendário**, Análises, Previsões. Shell: cabeçalho com logo à
esquerda e navegação em pílulas à direita.

JTBD do calendário: escolher um mês e uma região → ver de relance quais dias tiveram focos (MODIS ◆ / VIIRS ● com
contagens) → abrir um dia e ver contagens exatas, mapa de focos do dia e mudar dia/região sem voltar.

## Princípios

1. **Escuro, espacial, calmo.** Fundo quase preto `space-950`; o fogo é o único acento quente. Nada de gradientes
   chamativos, dourado, texturas de carta de baralho ou brilho holográfico.
2. **Superfícies planas e legíveis.** Cards `space-800` com borda 1px `space-600`, cantos `rounded-2xl`. Sem sombras
   pesadas; o único glow é o do botão vermelho e do ponto do logo.
3. **Dados em mono.** Números, datas, contagens, coordenadas sempre em JetBrains Mono.
4. **Nunca só cor.** Sensor = cor + forma + texto (◆ MODIS âmbar, ● VIIRS vermelho, Harmonizado azul). Status do dia =
   glifo + rótulo + contagem.
5. **Hierarquia por tipografia,** não por decoração: eyebrow mono âmbar → título Space Grotesk → texto `ink-300`.

## Cores (exatas — não introduzir outras)

| Token | Hex | Uso |
|---|---|---|
| space-950 | #04060c | fundo da página |
| space-900 | #0a0f1e | barras, rodapé, painéis laterais, chips sobre imagem (com /85) |
| space-800 | #121a31 | cards, itens de lista, hover de navegação |
| space-600 | #2a3558 | todas as bordas 1px |
| ink-100 | #f2f5ff | texto principal |
| ink-300 | #aab4d4 | texto secundário, rótulos |
| fire-500 | #e5242b | botão primário vermelho (um por tela) |
| fire-400 | #ff4a3d | VIIRS ●, hover do vermelho |
| ember-400 | #ffb02e | eyebrows, item de navegação ativo (fundo, texto space-950), hover de borda/texto, seleção, MODIS ◆ |
| earth-400 | #3aa6ff | Harmonizado, oceano |
| focus-ring | #ffd166 | contorno de foco 3px, offset 3px; também marca "hoje" |

Escala de intensidade de focos (calor, acessível, do mais fraco ao mais forte): `space-800` → `#5a2a1a` → `#a8401f`
→ `fire-500` → `fire-400` → `ember-400`. Sempre com número visível ao lado.

## Tipografia

- Display: **Space Grotesk** 500/700, `tracking-tight`. Hero `text-display` clamp(2.5rem→5.5rem) `leading-[1.05]`;
  H1 clamp(2rem→3.5rem); H2 clamp(1.5rem→2.25rem); H3 `text-xl font-bold`.
- Texto: **Fustat**, 1rem, line-height 1.6; secundário em `ink-300`; `text-lg` para leads.
- Dados: **JetBrains Mono**.
- Eyebrow: `font-mono text-caption (0.75rem) uppercase tracking-[0.2em] text-ember-400` (ex.: "NASA SPACE APPS 2026",
  "PASSO 1").

## Componentes

- **Cabeçalho:** `border-b border-space-600 bg-space-950`, `max-w-7xl`, logo (ponto vermelho 12px com glow
  `0 0 12px #ff4a3d` + "Fire Atlas" Space Grotesk bold) e pílulas `h-12 px-4 rounded-full font-semibold
  tracking-[-0.02em]`; ativa `bg-ember-400 text-space-950`, inativas `text-ink-300 hover:bg-space-800 hover:text-ink-100`.
- **Botão primário:** pílula `h-14 px-8 text-lg` (lg) ou `h-12 px-4` (md), `bg-fire-500 text-white`,
  `shadow-[0_0_40px_rgba(229,36,43,0.55)]`, seta "→" opcional.
- **Botão secundário:** pílula `border border-space-600 bg-space-800 text-ink-100 hover:border-ink-300`.
- **Chip/segmento:** pílula `h-12 px-4 border border-space-600 font-semibold`; hover/ativo `border-ember-400
  text-ember-400`.
- **Card:** `rounded-2xl border border-space-600 bg-space-800 p-6`; eyebrow mono âmbar, título display `text-xl`,
  texto `ink-300`.
- **Item de lista:** `rounded-xl border border-space-600 bg-space-800 px-4 py-3`.
- **Acordeão (FAQ):** card `p-5`, sinal "+" âmbar que gira 45°.
- **Rodapé:** `border-t border-space-600 bg-space-900`, `text-small text-ink-300`, linha mono `text-caption`.
- **Badge sobre mídia:** `rounded-full border border-space-600 bg-space-900/85 px-4 py-2 text-small`.
- **Campos (select/data):** `rounded-xl border border-space-600 bg-space-900`, rótulo `text-small text-ink-300` acima.

## Layout

- Container `mx-auto max-w-7xl px-6 sm:px-10`; seções `py-14`; grids `gap-4`, `md:grid-cols-3`; colunas de texto
  `max-w-prose`.
- Espaçamento base 4px (Tailwind). Gaps comuns: 2, 3, 4, 6, 10.
- Responsivo: mobile-first; em < lg o que é lateral vira empilhado.

## Movimento

Transições 200 ms `ease` (cor, borda, fundo). Sem flips 3D nem animações de entrada longas. Respeitar
`prefers-reduced-motion`.

## Acessibilidade

WCAG AA; foco visível `#ffd166`; navegação completa por teclado; alvos ≥ 44px; texto alternativo para mapas e gráficos;
link "pular para o conteúdo".

## Regras de dados (UI)

Não inventar números. Dados indisponíveis aparecem como "Indisponível" / "–", nunca como zero. "Sem registro" ≠ "sem
fogo". Origem do dado sempre identificável (MODIS ◆ / VIIRS ● / Harmonizado). Textos em português.
