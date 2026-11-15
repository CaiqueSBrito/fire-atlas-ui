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

## Dados: gold baixada para o PostgreSQL

O frontend só acessa a API REST (`/api/v2`), nunca o data lake nem credenciais AWS. No backend, `scripts/atualizar.sh`
baixa a camada gold do data lake para o PostgreSQL (padrão: últimos 7 dias, todas as resoluções H3; por exemplo,
`scripts/atualizar.sh 30 0,1,2,3,4` carrega 30 dias nas resoluções 0 a 4), e a API lê só essas tabelas. Por isso, o
front só consulta o que o script baixou:

- Resoluções e datas disponíveis vêm das importações `COMPLETED` de `GET /meta/sources` (`lib/api/coverage.ts`,
  cache de 1 minuto), separadas pela tabela que cada tela consulta:
  - mapa principal e mapa do dia no calendário (`/activity/cells`), calendário e atividade mensal das Análises:
    `gold/harmonized/cells/`;
  - indicadores, série, ranking e histórico das Análises e números da home: `gold/map_grid/`;
  - previsão: `gold/forecast/` (a tabela é H3 res 6 e a API aceita a região em qualquer resolução de 0 a 6).
- Uma importação conta só com linhas carregadas (`rowsLoaded > 0`), no período `minDate`–`maxDate`; reimportar
  substitui o período `periodStart`–`periodEnd` daquela resolução. Dia sem importação aparece como "sem dado",
  nunca como zero.
- Sem importação concluída da tabela da tela, a página mostra "Nenhum dado importado" e pede para rodar
  `scripts/atualizar.sh` no backend (na previsão, o aviso aparece como "Indisponível").
- O cliente HTTP espera até **20 segundos**, incluindo a transferência do corpo. Não usa `no-store`: respeita o
  `Cache-Control` da API.
- O detalhe RFC 7807 é mostrado também nos erros 5xx. Falhas de rede, timeout, 429 e 5xx (exceto 501) permitem até
  duas novas tentativas (600 ms entre elas). Rejeições 400/404 e recurso não implementado 501 não são repetidos.
- React Query mantém os dados frescos por 5 minutos e não repete consultas ao focar a janela. As chaves de cache
  usam as células H3 consultadas, calculadas nas resoluções importadas da tabela da tela; pequenos movimentos que
  cobrem as mesmas células reutilizam os resultados. Modo simulado mantém sua chave por bbox.
- O mapa mantém o debounce de 350 ms, a margem de 25% e a área de consulta enquanto o viewport continuar nela.
  Mudanças de filtro/área cancelam os pedidos anteriores no cliente.
- O período padrão é de 7 dias, igual à janela padrão do script. Intervalos acima de 366 dias são bloqueados também
  quando vêm diretamente pela URL.
- Resultados truncados são sinalizados nos mapas principal e diário; a previsão distingue o top-N da região inteira.

Detalhes de arquitetura e contratos: `CLAUDE.md`.

## Verificação

```bash
npm test
npm run lint
npx tsc --noEmit
```

Para verificar integração real, rode `scripts/atualizar.sh` no backend, suba a API e abra `/explore/map`,
`/explore/calendar`, `/explore/statistics` e `/explore/forecasts`.
