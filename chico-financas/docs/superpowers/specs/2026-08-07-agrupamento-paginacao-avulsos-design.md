# Agrupamento visual e paginação de entradas/saídas avulsas

Data: 2026-08-07

## Problema

As seções "Entradas" e "Saídas" do Painel mostram cada transação avulsa como
uma linha separada. Nomes se repetem com frequência (ex: "comercio",
"farmacia", "99", "ifood"), o que faz a lista crescer muito e fica difícil
ver o panorama do mês. Não há como saber rapidamente "quanto gastei no total
em X" sem somar manualmente.

## Objetivo

1. Agrupar visualmente lançamentos com o mesmo nome, mostrando a soma,
   sem perder o histórico das transações individuais.
2. Limitar quantos grupos aparecem antes de precisar expandir ("ver mais").
3. Aplicar isso às seções Entradas e Saídas do Painel (mês aberto ou
   fechado). Não se aplica a Recorrentes, Metas ou Investimentos.

Fora de escopo: mesclagem real no banco de dados (perderia o histórico
individual); login/autenticação (spec separada).

## Agrupamento (sem perder dados)

Nenhuma mudança na hora de criar um avulso — cada lançamento continua sendo
uma linha própria em `transacoes_mes`, como hoje. A mudança é só na
exibição: os itens de cada seção são agrupados por nome (comparação
normalizada: `nome.trim().toLowerCase()`), somando os valores.

- Grupo com **1 item**: renderiza exatamente como hoje — nome, valor, botão
  × (se aplicável).
- Grupo com **mais de 1 item**: renderiza como uma linha recolhida
  (`<details>/<summary>`) mostrando nome + soma; o selo/stamp (recorrente,
  fixo, meta, avulso) usado no resumo é o do primeiro item do grupo. Ao
  expandir, mostra cada ocorrência individual exatamente como uma linha
  normal, cada uma com seu próprio botão × (reaproveita `deletarAvulso`,
  já genérico, sem mudança de mutation).

Usa `<details>/<summary>` nativo do HTML — sem JavaScript, consistente com
o app (que hoje só tem 2 componentes client: `NavBar` e `Toast`).

## Paginação ("ver mais")

Depois de agrupar, se uma seção tiver mais de **8 grupos**, mostra os 8
primeiros (na ordem em que a query já retorna) e esconde o restante atrás
de outro `<details>` com `<summary>ver mais (N)</summary>`. Mesma técnica
sem JS.

## Implementação

Extrai um componente `ListaTransacoes` (Server Component síncrono, mesmo
arquivo `page.js` ou um novo `components/ListaTransacoes.js`) reaproveitado
pelas seções Entradas e Saídas, que hoje duplicam quase o mesmo JSX. Recebe:
a lista de itens já filtrada/ordenada, o rótulo do stamp por origem, e um
flag indicando se o mês está aberto (controla se o botão × aparece).

Função helper `agruparPorNome(items)` pura (sem I/O), usada dentro do
componente, retorna `[{ nome, total, itens: [...] }]` na ordem de primeira
ocorrência.

## Testes / verificação

Sem suíte automatizada. Verificação manual via `npm run dev` com dados
reais: criar avulsos repetidos e confirmar que agrupam e somam certo;
expandir um grupo e deletar uma ocorrência individual, confirmar que só
aquela some (e o total do grupo atualiza); confirmar que uma seção com mais
de 8 grupos mostra "ver mais" e expande corretamente; confirmar que um mês
fechado (sem avulsos novos, mas com recorrentes/custos confirmados) também
agrupa/pagina corretamente.
