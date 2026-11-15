# Extractable components

## Layout Components

## SiteHeader
- Source: `src/components/layout/site-header.tsx` (+ `logo.tsx`, `main-nav.tsx`, `src/config/navigation.ts`)
- Category: layout
- Description: Cabeçalho escuro com borda inferior; logo (ponto vermelho brilhante + "Fire Atlas") à esquerda e navegação em pílulas (Início, Mapa, Calendário, Análises, Previsões) à direita
- Extractable props: activeItem (string, default: "calendar")
- Hardcoded: textos do menu, ponto vermelho do logo, classes

## SiteFooter
- Source: `src/components/layout/site-footer.tsx`
- Category: layout
- Description: Rodapé da home com créditos NASA Space Apps e fonte dos dados
- Extractable props: none
- Hardcoded: textos e links

## Section
- Source: `src/features/home/components/section.tsx`
- Category: layout
- Description: Seção da home com título H2 em Space Grotesk, max-w-7xl
- Extractable props: none (conteúdo via slot)
- Hardcoded: classes

## Basic Components

## Button
- Source: `src/components/ui/button.tsx`
- Category: basic
- Description: Pílula com variantes primary (vermelho com glow), secondary (space-800 + borda), ghost
- Extractable props: variant (string, default: "secondary"), size (string, default: "md")
- Hardcoded: classes

## InfoCard
- Source: `src/features/home/components/how-it-works.tsx`, `data-sources.tsx`
- Category: basic
- Description: Card rounded-2xl space-800 com eyebrow mono ember ("Passo 1"), título display e texto ink-300
- Extractable props: none
- Hardcoded: classes

## RegionChip
- Source: `src/features/home/components/region-links.tsx`
- Category: basic
- Description: Chip pílula h-12 com borda space-600, hover ember-400
- Extractable props: isActive (boolean, default: false)
- Hardcoded: classes

## Select
- Source: `src/components/ui/select.tsx`
- Category: basic
- Description: Select customizado com rótulo, usado nos seletores Local/Horário
- Extractable props: none
- Hardcoded: classes
