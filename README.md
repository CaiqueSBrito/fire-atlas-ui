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

Reinicie o servidor Next ao mudar a URL. Sem essa variável, mapa e análises usam dados simulados identificados;
a previsão permanece indisponível. O backend fica no repositório `fire-atlas-api`.

## Integração com o Athena

O frontend continua acessando a API REST, nunca o Athena nem credenciais AWS diretamente. O backend consulta a gold
no S3 sem materializar os dados no Postgres. Os DTOs de mapa, calendário, análises e previsão foram preservados.

- `/meta/sources` foi removido. A cobertura vem de `/meta/coverage`, com período por sensor e cache compartilhado de
  10 minutos; as resoluções H3 da gold são 0–6.
- O cliente HTTP espera até **45 segundos**, incluindo a transferência do corpo. Não usa `no-store`: respeita o
  `Cache-Control` da API.
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
- **Estados de carregamento não foram alterados** nesta adaptação.

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
