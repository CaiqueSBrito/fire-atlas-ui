# Fire Atlas UI

Frontend Next.js para explorar focos MODIS/VIIRS, atividade harmonizada e previsões.

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

## Carga inicial e cache no backend

Ao entrar em qualquer rota, o frontend inicia ou acompanha `POST /api/v2/bootstrap/2026` e consulta o progresso com
`GET /api/v2/bootstrap/2026`, sem cache HTTP para essas duas operações. A interface segue a referência de vídeo:
globo animado, fundo espacial e barra vermelha. A barra representa arquivos/etapas realmente confirmados no banco;
não avança por temporizador e fica abaixo de 100% até o backend declarar `ready`.

O conjunto de 2026 fica **exclusivamente no backend**, em PostgreSQL com **PostGIS**. A carga mundial inclui todos os dias
publicados, MODIS/VIIRS e H3 0–6, além do catálogo de localização das células. O Athena seleciona as colunas
necessárias **antes da transferência**, exportando Parquet ZSTD. O backend baixa somente os arquivos desses
manifestos, com memória limitada, progresso persistente e retomada. Exportações e importações têm concorrência
limitada e configurável, com dois trabalhadores por etapa como padrão.
Não há exportação do ano inteiro para a memória, IndexedDB ou armazenamento local do navegador.
O catálogo preserva latitude/longitude da gold e gera pontos `geometry(Point, 4326)` no banco, com índice espacial
GiST. Esses pontos são os centros das células publicados pela fonte, não coordenadas individuais dos incêndios.
Durante o UNLOAD, a mensagem informa o avanço das exportações; a barra conta somente arquivos publicados
no PostGIS. A grade preserva dez colunas consumidas pelas telas; três campos não utilizados foram removidos.

Enquanto a carga não termina, os consumidores de dados das páginas não são montados. Os segmentos Next continuam
no fluxo de renderização e compartilham um único provider de progresso, inclusive durante navegação entre rotas.
Falhas mantêm o site na tela de carga,
exibem o erro e oferecem retomada. Visitantes simultâneos compartilham o mesmo trabalho no backend.
As telas liberadas consomem resultados filtrados por área e período desse cache; o cache habitual das respostas
de cada tela não é uma cópia do conjunto anual.

A estimativa separada para ampliar o gold do mapa a 2002–2026 está em
[`ESTIMATIVA-CARGA-GOLD-MAPA.md`](ESTIMATIVA-CARGA-GOLD-MAPA.md). Essa carga histórica **não foi iniciada**.

## Integração com a API

O frontend continua acessando a API REST, nunca o Athena nem credenciais AWS diretamente. A grade de 2026
é materializada no cache compartilhado; outros anos e outras fontes continuam nas rotas existentes.
Os DTOs de mapa, calendário, análises e previsão foram preservados.

- `/meta/sources` foi removido. A cobertura vem de `/meta/coverage`, com período por sensor e cache compartilhado de
  10 minutos; as resoluções H3 da gold são 0–6.
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
- O mapa diário do calendário é fixo: sem arraste, zoom, rotação ou navegação por teclado. Trocar a região
  reenquadra o mapa e consulta a área selecionada, sem seguir o viewport.
- Sem data explícita, o calendário prioriza o último dia com atividade e cobertura espacial de detecções.
  As duas fontes podem terminar em dias diferentes; uma data fora da grade mostra um aviso com o último
  dia coberto, sem reutilizar focos do dia anterior.

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
