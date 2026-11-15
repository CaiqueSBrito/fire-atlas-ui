# Estimativa de carga histórica — gold do mapa (2002–2026)

Data da investigação: 15/11/2026.

> **Atualização da arquitetura:** a carga de 2026 passou a usar projeção no Athena via UNLOAD para Parquet ZSTD,
> com duas exportações simultâneas e dois importadores paralelos por padrão. As estimativas de 12–36 horas
> abaixo são a referência histórica do caminho anterior, **não uma previsão recalibrada do fluxo otimizado**.
> Não existe ainda benchmark integral de 2002–2026 com a nova implementação; não se presume aceleração de 2× ou 10×.

## Escopo e arquitetura

Estimativa para a primeira carga mundial de **2002 a 2026**, com todos os dias disponíveis, sensores MODIS/VIIRS e resoluções H3 **0 a 6**, exclusivamente das tabelas usadas na visualização do mapa:

- `gold/map_grid`: grade diária por célula e sensor;
- `gold/h3_places`: localização das células, carregada uma vez, pois não é particionada por ano.

Não inclui bronze, silver, harmonização, previsão nem `gold/ml_dataset`.

**O conjunto completo e seu cache persistente ficam exclusivamente no backend/PostgreSQL com PostGIS.** O frontend acompanha o status da carga e consome consultas por área, período e resolução sobre esse cache. Não baixa nem armazena o conjunto anual/histórico inteiro no navegador. O cache normal das respostas da tela não constitui uma cópia do histórico completo.

Esta investigação **não iniciou a carga de 2002–2026**. A implementação da carga inicial permanece restrita a **2026**; ampliar esse intervalo é uma alteração separada.

## Conclusão

**[INFERÊNCIA] Faixa provisória: 12–36 horas para a primeira carga completa neste ambiente.** Para planejamento, considerar 12–24 horas, podendo se aproximar de 36 horas se a conexão lenta observada persistir e a persistência se tornar o gargalo.

Uma importação anterior realmente executada fornece uma extrapolação de **aproximadamente 11,1 horas**. Contudo, essa execução usava o caminho antigo de importação; o novo fluxo de staging, índices e publicação por arquivo ainda não havia sido medido integralmente quando esta estimativa foi produzida.

O uso de PostGIS preserva os centros das células publicados na gold como `geometry(Point, 4326)`, com índice GiST. O custo adicional dessa geometria e do índice ainda não foi isolado; a faixa continua provisória.

A faixa não é um benchmark da carga completa, um prazo garantido ou um SLA. Após concluída, a carga é compartilhada e reutilizada por todos os visitantes, sem repetir a transferência histórica por usuário.

## Volume observado

Leitura autenticada dos metadados Delta de `gold/map_grid`, snapshot **v313**, realizada nesta investigação. Foram somados apenas arquivos ativos, excluindo logs e arquivos removidos pelo Delta. A leitura dos metadados levou **6,882 segundos**.

| Recorte do mapa | Arquivos ativos | Partições resolução/ano | Linhas | Parquet comprimido |
| --- | ---: | ---: | ---: | ---: |
| 2002–2026 | 195 | 175 | 445.068.136 | 5.733.700.917 bytes |
| Apenas 2026 | 8 | 7 | 26.033.141 | 352.349.913 bytes |
| Snapshot completo, 2000–2026 | 209 | 189 | 448.422.019 | 5.772.415.624 bytes |

O recorte solicitado foi calculado retirando 2000 e 2001 do snapshot completo: 3.353.883 linhas e 38.714.707 bytes.

A maior data observada no snapshot é **13/11/2026**. Portanto, o volume de 2026 não representa um ano completo. Datas sem registros não devem ser inventadas nem interpretadas automaticamente como ausência de incêndio. Os sensores têm períodos de operação diferentes; não existe VIIRS em todos os anos desde 2002.

Para `h3_places`, o inventário documental anterior, de 14/11, registra aproximadamente **97 MB** e **2,76 milhões de linhas**. Esses valores não foram reconfirmados em um snapshot atual nesta estimativa. O volume combinado aproximado é **5,83 GB comprimidos**, sujeito à versão de lugares.

O tamanho final no PostgreSQL será diferente e incluirá dados descomprimidos, índices, staging e WAL. Não foi medido; os 5,83 GB não são uma estimativa do espaço necessário no banco.

## Medições de transporte S3

Foram feitas leituras parciais reais com PyArrow/S3, sem baixar o conjunto completo:

| Operação | Bytes | Tempo observado |
| --- | ---: | ---: |
| Leitura parcial, incluindo abertura/HEAD | 8.388.608 | 40,001 s |
| Abertura/HEAD em outra sessão | — | 3,267 s |
| Leitura parcial em offset de 8 MiB, após abertura | 1.048.576 | 3,548 s |
| Leitura parcial em offset de 16 MiB, após abertura | 1.048.576 | 9,090 s |

As duas últimas amostras correspondem a aproximadamente **0,115–0,296 MB/s**. A primeira, incluindo abertura, corresponde a aproximadamente **0,210 MB/s**.

**[INFERÊNCIA]** Se a taxa de 0,210 MB/s fosse mantida, somente o transporte dos 5.733.700.917 bytes do mapa levaria **7,60 horas**, mais cerca de 8 minutos para lugares. Usando as taxas extremas das amostras de 1 MiB, os aproximadamente 5,83 GB combinados levariam **5,5–14,1 horas** de rede.

Limitações: são amostras pequenas, sujeitas a latência, variação de rede e overhead. PyArrow não é o SDK Java utilizado na carga nova. Não representam o desempenho garantido de uma transferência contínua nem da AWS em geral.

## Referência de importação anterior

Os logs da execução já concluída `api-sync-incremental` registram:

- snapshot `map_grid` v313;
- sete resoluções, período de 08–15/11/2026;
- **407.302 linhas efetivamente carregadas**;
- início: **11:08:31.004**;
- término: **11:09:07.584**;
- duração: **36,580 segundos**;
- taxa composta: aproximadamente **11.134 linhas/segundo**.

Extrapolação para o recorte solicitado:

```text
445.068.136 × 36,580 / 407.302 ≈ 39.971 segundos ≈ 11,1 horas
```

Esse tempo inclui operações de leitura, transporte e persistência do caminho antigo. **Não é uma medição isolada de PostgreSQL. Não se deve somar 11,1 horas de “banco” às 7,60 horas de rede**, pois isso contaria componentes sobrepostos como se fossem independentes.

O fluxo atual projeta dez colunas de grade no próprio Athena, exporta Parquet ZSTD e só então transfere os
arquivos ao backend. Dois importadores independentes leem os arquivos com DuckDB e persistem lotes em staging,
publicados atomicamente. A taxa efetiva depende de disco, índices, WAL, rede e contenção do banco. As amostras
de transferência acima medem arquivos originais: o tamanho do histórico projetado ainda não foi medido.

## Cache e acessos seguintes

- O backend compartilha a carga entre visitantes e persiste o progresso.
- Um arquivo só conta como concluído depois de sua publicação confirmada no banco.
- Retomadas reutilizam os arquivos concluídos e inalterados.
- Atualizações verificam os snapshots; exportações e arquivos confirmados são reutilizados enquanto o snapshot/projeção for o mesmo. Um snapshot novo gera uma nova exportação, não uma promessa de atualização apenas por arquivo original.
- O frontend recebe progresso real e resultados das consultas, não os 445 milhões de registros.
- A carga atual usa Athena UNLOAD → Parquet projetado/ZSTD no S3 → DuckDB → PostgreSQL/PostGIS. O frontend não recebe resultados CSV anuais.

## Evidências e método

- Snapshot S3 atual de `gold/map_grid`, Delta v313, obtido com `deltalake.DeltaTable.get_add_actions(flatten=True)`, agrupando `size_bytes`, `num_records`, `partition.year` e `partition.resolution`.
- Leituras autenticadas e temporizadas com `pyarrow.fs.S3FileSystem`, sem divulgar credenciais.
- Logs existentes de `api-sync-incremental`, importação de 407.302 linhas, entre 11:08:31.004 e 11:09:07.584.
- `../fire-atlas-data/.omp/tasks/lake-camadas-prata-gold.md`: inventário anterior de lugares.
- `../fire-atlas-data/.tmp/gold-finish.log`: contagens históricas compatíveis com o snapshot atual.
- [NASA FIRMS — dados e períodos disponíveis](https://firms.modaps.eosdis.nasa.gov/download/).

Para substituir esta previsão por um benchmark, medir a carga efetiva no backend, separando transferência, leitura Parquet, escrita/publicação no PostgreSQL e espaço em disco. Preservar a distinção entre primeira carga e reutilização do cache.

## Verificação da otimização de 2026

- Probe real com `resolution=0`, `year=2026` e uma linha: Parquet de 1.674 bytes, compressão ZSTD e exatamente dez colunas, verificados após download.
- Probe sem registros: consulta bem-sucedida com manifesto vazio, sem inventar arquivos/dados.
- Na execução integrada, as 14 exportações de grade/lugares H3 0–6 concluíram; a interface mostrou dois importadores ativos e publicações reais no banco.
- Suíte backend: 105 testes passaram com PostgreSQL/PostGIS acessível, sem testes ignorados.
- A carga completa ainda não foi cronometrada até o estado `ready`; não há ganho percentual demonstrado.
- Exportações geram custo de consulta, requisições e armazenamento S3. A credencial permite exportar/ler, mas negou `DeleteObject`; os pequenos objetos dos probes permaneceram no S3. Retenção/limpeza exige política de lifecycle compatível com retomadas ou ação administrativa.
- [Contrato e limitações do UNLOAD](https://docs.aws.amazon.com/athena/latest/ug/unload.html).

## Medição específica: carga otimizada de 2026

Observação em 15/11/2026, durante a primeira carga real, com dois UNLOADs e dois importadores por etapa.
**[INFERÊNCIA] Estimativa atual: 25–45 minutos no total**, incluindo exportação, transferência, staging e
publicação no PostgreSQL/PostGIS. **Na amostra das 17:24:44 (UTC−3), restavam aproximadamente 15–35 minutos.**
Não é o tempo final medido: o estado ainda era `loading`, sem reinício nem nova carga para obter as amostras.

Escopo: todos os registros disponíveis de 2026, mundo inteiro, MODIS/VIIRS e H3 0–6; o snapshot do mapa
termina em 13/11/2026. Inclui o catálogo mundial de lugares necessário à visualização. Não inclui bronze,
silver, harmonização, previsão ou conjunto de treinamento; não representa datas futuras ainda não publicadas.

| Componente | Linhas previstas pelo plano |
| --- | ---: |
| Grade diária de 2026, H3 0–6 | 26.033.141 |
| Catálogo de lugares, H3 0–6 | 2.760.810 |
| Total | 28.793.951 |

O primeiro atendimento HTTP dessa execução foi registrado por volta de **17:17:05**. As 14 exportações
estavam confirmadas em **17:18:07**: aproximadamente um minuto desde a entrada, incluindo preparação.
O banco registra a confirmação do primeiro arquivo H3 0 em **17:18:28**.

### Amostras observadas

Horários abaixo em UTC−3. Staging ainda não é dado liberado para as telas.

| Horário | Grade publicada | Grade em staging | Situação |
| --- | ---: | ---: | --- |
| 17:21:02,931 | 2.216.872 | 2.727.511 | Importação/publicação de H3 4 |
| 17:22:34,415 | 2.216.872 | 3.988.522 | H3 4 aguardando publicação e H3 5 iniciado |
| 17:23:44,080 | 5.899.139 | Pelo menos 2.270.000 | Mensagem real do trabalhador H3 5 |
| 17:24:44,368 | 5.899.139 | Pelo menos 4.283.000 | Mensagem real do trabalhador H3 5 |

Primeira janela: **1.261.011 linhas adicionais em 91,483 s**, aproximadamente **13.784 linhas/s**,
considerando publicado + staging e abrangendo uma transição de arquivo/publicação.
Segunda janela, sem contar tabelas grandes: o trabalhador H3 5 informou **2.013.000 linhas adicionais
em 60,288 s**, aproximadamente **33.390 linhas/s**. Essa segunda taxa mede staging de um trabalhador,
não a conclusão de transações nem o desempenho de lugares/PostGIS.

Na última amostra havia pelo menos **10.182.139 linhas materializadas** entre grade publicada e staging,
e **18.611.812 linhas ainda por materializar**, além da publicação pendente do staging. Dividir esse restante
pelas taxas observadas dá **9–23 minutos apenas de avanço linear**. A faixa de **15–35 minutos restantes**
adiciona margem não calibrada para transferências, publicação, índices/WAL, PostGIS e variação de contenção.
Somada aos cerca de oito minutos já decorridos, a previsão arredondada é **25–45 minutos totais**.

Limitações: H3 6 concentra 12.546.085 linhas e ainda não estava publicado; as resoluções finas e a geometria
podem alterar a taxa. As primeiras contagens de staging levaram 4,8–15,6 segundos por consulta e podem ter
interferido na carga; a segunda janela usou apenas status e marcadores pequenos. Uma consulta auxiliar com
contagem agrupada excedeu 15 segundos e não foi usada no cálculo. A verificação de atividade observou
autovacuum no staging. O prazo não é garantia nem benchmark completo até `ready`.

Dados coletados de `annual_grid_partition`, `annual_athena_export`, `annual_grid_bootstrap` e contagens
pontuais de `annual_map_grid_stage`, sem baixar outra cópia do ano. O cache permanece exclusivamente no backend.
Esta medição de 2026 não recalibra automaticamente a estimativa histórica de 2002–2026.
