# Reorganização em múltiplas telas + correções críticas

Data: 2026-08-06

## Contexto

O Chico Finanças hoje é uma única página (`src/app/page.js`) com 6 seções: resumo do
mês, entradas/saídas avulsas, recorrentes, custos fixos, metas e investimentos, mais
um extrato por período. Já existem telas de detalhe (`metas/[id]`, `investimentos/[id]`),
mas a listagem/gestão de cada tipo de dado ainda está toda amontoada na Home.

Além da reorganização, dois bugs foram encontrados durante a revisão do projeto:

1. `actions.js` importa `INSERIR_INVESTIMENTO` de `queries.js`, mas essa mutation nunca
   foi definida — cadastrar um investimento novo quebra em runtime.
2. `src/app/api/cron/route.js` está vazio (só um comentário dizendo "cola a lógica
   aqui"). O cron do Vercel (`vercel.json`, roda 5h da manhã) bate nessa rota todo dia
   e não fecha nenhum mês — o fechamento automático de mês não funciona em produção.

## Objetivo

1. Dividir a Home em 4 telas (Painel, Recorrentes & Custos Fixos, Metas, Investimentos)
   ligadas por uma barra de navegação superior fixa.
2. Corrigir os dois bugs acima.
3. Adicionar validação básica de valores nas server actions monetárias.
4. Permitir editar nome/valor de recorrentes e custos fixos (hoje só dá pra
   ativar/desativar).

Fora de escopo nesta rodada: categorias/tags de gastos, gráficos, exportação,
cálculo automático de rendimento de investimentos, autenticação multiusuário.

## Arquitetura de rotas

```
src/app/
  layout.js                        → passa a renderizar <NavBar/>
  page.js                          → Painel: resumo do mês + entradas/saídas avulsas
                                      + extrato por período (como já é hoje, menos as
                                      seções de recorrentes/custos/metas/investimentos)
  recorrentes/page.js               → NOVA: lista + criar + editar + toggle de
                                      recorrentes e custos fixos
  metas/page.js                     → NOVA: lista + criar + remover metas
                                      (o card de cada meta linka pra metas/[id] como hoje)
  metas/[id]/page.js                → sem mudança estrutural
  investimentos/page.js             → NOVA: lista + criar investimentos
                                      (o card de cada investimento linka pra
                                      investimentos/[id] como hoje)
  investimentos/[id]/page.js        → sem mudança estrutural
  components/NavBar.js              → NOVO
```

O parâmetro `?mes=` continua controlando só a navegação de mês do Painel. As outras
telas (Recorrentes, Metas, Investimentos) não dependem de mês — são gestão geral,
igual já é hoje.

## Navegação (NavBar)

`src/app/components/NavBar.js`, renderizado dentro de `layout.js` (aparece em todas
as páginas, dentro do `.wrap`). 4 links: Painel · Recorrentes & Custos · Metas ·
Investimentos. Precisa saber a rota ativa pra destacar o link — como o resto do app é
Server Components, esse é o único componente `"use client"` do projeto, usando
`usePathname()`. Estilo visual segue a identidade "recibo" existente (mesma paleta de
`globals.css`, fonte mono pros labels).

## Bugs

- **`INSERIR_INVESTIMENTO`**: adicionar mutation em `queries.js`, no mesmo padrão das
  outras `INSERIR_*`, inserindo em `investimentos` com `nome`, `tipo`,
  `valor_investido`, `taxa_anual`, `prazo_dias`, retornando `id_investimento`.
- **`/api/cron/route.js`**: portar a lógica de `fecharMesesAtrasados()` de
  `scripts/fechar-mes.js` para dentro do handler `GET`, usando `nhostQuery` de
  `@/lib/nhost` em vez do `query()` duplicado do script. `scripts/fechar-mes.js`
  continua existindo pra rodar manualmente se precisar.
- **`scripts/agendador.js`**: removido. É redundante com o cron do Vercel e não
  serve pra produção serverless (depende de um processo Node rodando continuamente).

## Validação de valores

Nas server actions que recebem valor monetário (`adicionarAvulso`,
`adicionarRecorrente`, `adicionarCustoFixo`, `editarRecorrente`, `editarCustoFixo`,
`adicionarMeta`, `guardarNaMeta`, `retirarDaMeta`, `adicionarItemMeta`,
`editarItemMeta`, `adicionarInvestimento`, `guardarNoInvestimento`,
`retirarDoInvestimento`, `comprarItemParcelado`, `comprarAvulsoParcelado`):
adicionar uma checagem `valorValido(v)` (helper em `actions.js`: `v > 0 &&
!Number.isNaN(v)`). Se inválido, a action não executa a mutation e redireciona de
volta com `?erro=valor_invalido`, reaproveitando o padrão existente de `<Toast/>`.
Sem lib de validação externa (zod etc.) — checagem simples demais pra justificar.

## Editar Recorrentes/Custos Fixos

Em `recorrentes/page.js`, cada linha ganha um link `?editar=<id>` que troca a linha
por um form inline com `nome`/`valor` pré-preenchidos (mesmo padrão já usado em
`metas/[id]/page.js` para itens de meta). Novas mutations `EDITAR_RECORRENTE` e
`EDITAR_CUSTO_FIXO` em `queries.js`, novas actions `editarRecorrente` /
`editarCustoFixo` em `actions.js`.

## Testes / verificação

Sem suíte de testes automatizados no projeto. Verificação manual via `npm run dev`
no browser: navegar pelas 4 telas, criar/editar/ativar-desativar recorrente e custo
fixo, criar meta e investimento pelas novas telas, confirmar que o Painel ainda
calcula o resumo do mês corretamente, testar validação de valor negativo/zero, e
confirmar visualmente que o cron route.js agora compila (sem poder testar o cron
real do Vercel localmente).
