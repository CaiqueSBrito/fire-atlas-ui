# Fire Atlas UI

Frontend Next.js para explorar focos MODIS/VIIRS, atividade harmonizada e previsões.

A interface está em inglês (`lang="en"`), incluindo navegação, filtros, acessibilidade, gráficos e estados de
carga/erro. Datas e números usam `en-US` (datas curtas `MM/DD/YYYY`, mantendo UTC). Identificadores de região,
rotas e contratos da API não mudam. As mensagens conhecidas em português da API são traduzidas na apresentação
por `src/lib/api/english-message.ts`; diagnósticos desconhecidos são preservados para não ocultar informações.

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Configure no `.env`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v2
```

Reinicie o servidor Next ao mudar a URL. O backend fica no repositório `fire-atlas-api`.
A entrada exige uma API configurada e uma carga real concluída; sem ela, a tela mostra o motivo e não simula sucesso.

A navegação mantém o cabeçalho entre rotas e desliza o destaque amarelo até a aba ativa em 420 ms,
ajustando a largura ao texto. A transição respeita a preferência de movimento reduzido e mantém
a rolagem horizontal em telas pequenas.

## Carga inicial e cache no backend

Ao entrar em qualquer rota, o frontend inicia ou acompanha `POST /api/v2/bootstrap/2026` e consulta o progresso com
`GET /api/v2/bootstrap/2026`, sem cache HTTP para essas duas operações. A interface segue a referência de vídeo:
globo animado, fundo espacial e barra vermelha. A barra representa arquivos/etapas realmente confirmados no banco;
não avança por temporizador e fica abaixo de 100% até o backend declarar `ready`.
A tela de carga ocupa toda a janela, com conteúdo centralizado e rolagem em telas baixas.

O conjunto de 2026 fica **exclusivamente no backend**, em PostgreSQL com **PostGIS**. O frontend usa MODIS/VIIRS
e resoluções H3 **0–5**, além do catálogo de localização das células. O Athena seleciona as colunas
necessárias **antes da transferência**, exportando Parquet ZSTD. O backend baixa somente os arquivos desses
manifestos, com memória limitada, progresso persistente e retomada. A grade é exportada com um UNLOAD por mês de
cada resolução: por padrão os 12 meses rodam em paralelo (`BOOTSTRAP_EXPORT_CONCURRENCY=12`, 1–12); importações
usam dois trabalhadores como padrão (1–12; nesta máquina, 12). Lugares grandes são divididos em até 8 partes
disjuntas por hash da célula; a importação prioriza arquivos grandes/desconhecidos para evitar um arquivo
grande sozinho no fim. O backend grava diretamente com COPY, com publicação atômica por arquivo.
Não há exportação do ano inteiro para a memória, IndexedDB ou armazenamento local do navegador.
O catálogo preserva latitude/longitude da gold e gera pontos `geometry(Point, 4326)` no banco, com índice espacial
GiST. Esses pontos são os centros das células publicados pela fonte, não coordenadas individuais dos incêndios.
Durante o UNLOAD, a mensagem informa o avanço das exportações; a barra conta somente arquivos publicados
no PostGIS. A grade preserva dez colunas consumidas pelas telas; três campos não utilizados foram removidos.

Enquanto a carga de **2026** não termina, os consumidores de dados das páginas não são montados. Os segmentos Next continuam
no fluxo de renderização e compartilham um único provider de progresso, inclusive durante navegação entre rotas.
Falhas mantêm o site na tela de carga,
exibem o erro e oferecem retomada. Visitantes simultâneos compartilham o mesmo trabalho no backend.
As telas liberadas consomem resultados filtrados por área e período desse cache; o cache habitual das respostas
de cada tela não é uma cópia do conjunto anual.

Depois de 2026 ficar `ready`, o backend continua com **2025, 2024 e todos os anos anteriores disponíveis no manifesto
Delta**, em ordem decrescente, um ano por vez, sem bloquear a navegação. É a mesma arquitetura de 2026:
UNLOAD mensal projetado → Parquet ZSTD → COPY no PostgreSQL/PostGIS, com progresso e retomada por arquivo.
O catálogo de lugares é compartilhado, sem nova cópia por ano. Fechar a aba não cancela a fila no servidor.
Falha histórica mantém os anos prontos consultáveis; o próximo `POST /api/v2/bootstrap/2026` retoma o ano pendente.
`GET /api/v2/bootstrap/{ano}` acompanha passivamente o progresso histórico. Apenas anos integralmente publicados
entram nas consultas locais; anos pendentes continuam sendo consultados na fonte existente, sem expor dados parciais.

A estimativa histórica está em [`ESTIMATIVA-CARGA-GOLD-MAPA.md`](ESTIMATIVA-CARGA-GOLD-MAPA.md).
Ela preserva medições antigas e não é um benchmark da fila nova. A implementação foi verificada com fonte controlada
e PostgreSQL real; não foi iniciada uma importação histórica completa da AWS nesta alteração.

## Integração com a API

O frontend continua acessando a API REST, nunca o Athena nem credenciais AWS diretamente. A grade dos anos prontos
é materializada no cache compartilhado; anos pendentes e outras fontes continuam nas rotas existentes.
Os DTOs de mapa, calendário, análises e previsão foram preservados.

- `/meta/sources` foi removido. A cobertura vem de `/meta/coverage`, com período por sensor e cache compartilhado de
  10 minutos; o frontend limita as consultas, rankings e agregação visual às resoluções H3 0–5.
- O cliente HTTP espera até **45 segundos**, incluindo a transferência do corpo. Consultas de exploração respeitam
  o `Cache-Control` da API; somente o início e acompanhamento da carga usam `no-store` explicitamente.
- O detalhe RFC 7807 é mostrado também no **503**. Falhas de rede, timeout, 429 e 5xx (exceto 501) permitem até duas
  novas tentativas com backoff. Rejeições 400/404 e recurso não implementado 501 não são repetidos automaticamente.
- React Query mantém os dados frescos por 5 minutos e não repete consultas ao focar a janela. As chaves de cache
  usam as células H3 realmente consultadas, ordenadas; pequenos movimentos que cobrem as mesmas células reutilizam
  os resultados. Modo simulado mantém sua chave por bbox.
- O mapa mantém o debounce de 350 ms, a margem de 25% e a área de consulta enquanto o viewport continuar nela.
  Mudanças de filtro/área cancelam os pedidos anteriores no cliente. Cancelar o HTTP não garante interromper uma
  consulta já iniciada no Athena.
- O período padrão é de 7 dias. Intervalos acima de 366 dias são bloqueados também quando vêm diretamente pela URL.
  Datas históricas desde 2000 continuam acessíveis, sem depender de uma primeira carga local.
- Resultados truncados são sinalizados nos mapas principal e diário; a previsão distingue o top-N da região inteira.
- O mapa diário do calendário permite arraste e zoom, consultando a área visível com debounce.
  O calendário reaproveita o lugar selecionado no mapa principal quando a região coincide; um bbox na URL tem prioridade.
- Sem data explícita, o calendário prioriza o último dia com atividade e cobertura espacial de detecções.
  As duas fontes podem terminar em dias diferentes; uma data fora da grade mostra um aviso com o último
  dia coberto, sem reutilizar focos do dia anterior.
- A home segue a UI de `origin/script` em **`11b9051`**: logo em degradê, um único botão principal,
  globo com identificação por hover (sem navegação por clique), textos revisados, seção da equipe com seis fotos
  e novos ícones. FAQ e atalhos regionais antigos foram substituídos conforme essa referência.
  Os totais recentes e os pontos reais/ilustrativos continuam consumindo a API atual.
- Previsões têm mapa, escala vermelha, lista selecionável e detalhes da célula; a tabela completa fica recolhida.
  A previsão mantém H3 res6 nativa como exceção exclusiva desse produto, sem reagrupar probabilidades.
  A carga usa `/bootstrap/forecast` e só começa depois de 2026 e de todos os anos históricos; a tela de previsões
  apenas acompanha (GET) e mostra uma barra baseada em arquivos e finalização confirmados, sem bloquear a navegação.
  Detecções, histórico e rankings continuam em H3 0–5.
- Análises incluem atividade harmonizada mensal em `/activity/monthly`, distinguindo mês parcial, zero e ausência de dados.
  O ranking selecionável atualiza a comparação histórica da célula via `/compare/historical`, com acesso por teclado
  e indicação de anos sem registro. O gráfico diário “Detecções por dia” e sua tabela foram removidos;
  os indicadores, a atividade mensal, o ranking e o histórico permanecem disponíveis.
- O chip de sensores MODIS/VIIRS foi removido da barra de filtros. A seleção continua disponível no modal
  e participa do contador de filtros e da ação “Limpar filtros”.
- A integração visual usa a referência remota atualizada de `script` (`11b9051`), incluindo tipografia global,
  calendário, filtros, mapa e análises. Carregamento anual, fila histórica, cobertura e alterações locais da `main`
  foram preservados; Docker e o modelo de importação/API da outra branch não foram incorporados.
- Novas exportações anuais também usam H3 0–5. A migração histórica preserva dados existentes no backend;
  não executa uma limpeza destrutiva do banco.

Detalhes de arquitetura e contratos: `CLAUDE.md`.

## Verificação

```bash
npm test
npm run lint
npx tsc --noEmit
```

Para verificar integração real, execute a API e abra `/explore/map`, `/explore/calendar`, `/explore/statistics` e
`/explore/forecasts`. A API pode emitir várias consultas Athena por página; o tempo HTTP total não é o de uma única
consulta SQL.
