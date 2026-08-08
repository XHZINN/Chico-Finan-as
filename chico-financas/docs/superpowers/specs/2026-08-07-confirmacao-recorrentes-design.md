# Confirmação manual de recorrentes e custos fixos

Data: 2026-08-07

## Problema

Hoje, ao fechar um mês (via cron ou `scripts/fechar-mes.js`), o sistema insere
automaticamente TODOS os recorrentes/custos fixos ativos como transações reais
daquele mês. E enquanto o mês está aberto, o Painel já soma esses valores no
"Saldo de caixa" como se já tivessem acontecido (via `ATIVOS`), mesmo que o
dinheiro ainda não tenha entrado/saído de verdade.

Isso não reflete a realidade: o salário de julho, por exemplo, só cai na conta
em 6 de agosto — não no dia em que o mês de julho "fecha" no sistema.

## Modelo novo (regime de caixa, confirmado por clique)

- Recorrentes/custos fixos continuam sendo templates recorrentes (tabela
  `recorrentes`/`custos_fixos` inalterada — nome, valor, status ativo/inativo).
- Uma ocorrência só entra no saldo quando o usuário clica **"confirmar"** —
  e conta para o mês que estiver **aberto no momento da confirmação**, não
  para o mês "de referência". Ex: confirmar o salário de julho em 6/ago conta
  como uma entrada de agosto.
- Se um recorrente/custo não for confirmado antes do mês fechar, ele
  simplesmente volta a aparecer como pendente no mês seguinte — sem lançamento
  retroativo, sem reabrir mês fechado.

## Sem mudança de schema

Para saber quais recorrentes/custos já foram confirmados no mês aberto,
comparamos por **nome**: um recorrente ativo é considerado "pendente" se seu
nome ainda não aparece como transação deste mês com `origem: "recorrente"`
(mesma lógica para custos fixos com `origem: "custo_fixo"`). Evita migração
de banco (nova coluna/FK); aceita o risco baixo de colisão de nomes, coerente
com o resto do app (que já identifica coisas por nome em vários pontos).

"Confirmar" insere uma `transacoes_mes` real reaproveitando a mutation
`INSERIR_TRANSACAO_META` (já genérica — aceita `origem` como parâmetro,
apesar do nome), com `origem: "recorrente"` ou `"custo_fixo"`, `tipo`
`entrada`/`saida`, para o `id_mes` do mês atualmente aberto.

## Painel (mês aberto)

- **Entradas/Saídas**: mostram só o que já foi confirmado (transações reais).
  Ganham um botão **×** pra desfazer, reaproveitando `deletarAvulso` (a
  mutation já é genérica — deleta qualquer `transacoes_mes` por id — só muda
  a condição de exibição do botão pra incluir `origem` recorrente/custo_fixo
  além de avulso, enquanto o mês estiver aberto).
- **Nova seção "Pendentes"**: lista os recorrentes/custos ativos ainda não
  confirmados neste mês, cada um com um botão "confirmar".
- **Totais** ("Entradas reais", "Saídas reais", "Saldo de caixa") somam só o
  confirmado — remove o blend automático com `ATIVOS` que existia antes.

## Mês fechado

Sem mudança — mostra só o que está gravado (histórico), como já funciona.

## Cron / `scripts/fechar-mes.js`

Para de inserir recorrentes/custos automaticamente ao fechar o mês. Passa a
só marcar `fechado: true` e abrir o próximo mês (mantém a lógica de
parcelamentos ativos, que é independente e não muda).

## Extrato por período

Remove o blend com `ATIVOS` para meses abertos dentro do intervalo — passa a
somar só transações reais em todos os meses do período, consistente com o
Painel.

## Novas actions

- `confirmarRecorrente(formData)`: recebe `id_mes`, `nome`, `valor`; insere
  via `INSERIR_TRANSACAO_META` com `origem: "recorrente"`, `tipo: "entrada"`.
- `confirmarCustoFixo(formData)`: idem, `origem: "custo_fixo"`,
  `tipo: "saida"`.

## Testes / verificação

Sem suíte automatizada. Verificação manual via `npm run dev` com dados reais:
confirmar um recorrente/custo pendente e ver o saldo mudar; desfazer uma
confirmação; navegar entre meses e confirmar que um mês fechado não muda;
rodar `scripts/fechar-mes.js` e confirmar que ele não insere mais
recorrentes/custos automaticamente.
