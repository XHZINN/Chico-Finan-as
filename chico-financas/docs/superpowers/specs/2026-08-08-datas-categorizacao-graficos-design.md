# Data de lançamento, categorização automática e relatórios gráficos

Data: 2026-08-08

## Contexto

Três pedidos relacionados, desenhados e implementados em sequência numa
mesma sessão (decisão do usuário): guardar a data de cada lançamento,
categorizar gastos automaticamente por palavra-chave, e uma tela de
gráficos pra visualizar o fluxo financeiro por categoria.

## Parte 1 — Data do lançamento

Coluna nova `criado_em timestamptz not null default now()` em
`transacoes_mes`. Preenchida automaticamente pelo Postgres em todo
`INSERT`, sem mudança em nenhum formulário (decisão do usuário: automática,
sem campo editável). O Extrato por período passa a poder mostrar a data
exata de cada lançamento, não só o mês a que pertence.

Migração SQL:
```sql
ALTER TABLE transacoes_mes ADD COLUMN criado_em timestamptz NOT NULL DEFAULT now();
```

## Parte 2 — Categorização automática

### Schema novo

```sql
CREATE TABLE categorias (
  id_categoria uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categoria_palavras (
  id_categoria uuid NOT NULL REFERENCES categorias(id_categoria) ON DELETE CASCADE,
  palavra text NOT NULL,
  PRIMARY KEY (id_categoria, palavra)
);

ALTER TABLE transacoes_mes ADD COLUMN id_categoria uuid REFERENCES categorias(id_categoria) ON DELETE SET NULL;
```

`criado_em` em `categorias` define a ordem de prioridade em caso de uma
palavra bater em mais de uma categoria (a mais antiga vence).

### Motor de matching — sem LIKE, sem SQL dinâmico

Roda inteiramente em JavaScript no servidor (nunca vira SQL). Passos, para
um nome de lançamento:

1. Normaliza o nome e cada palavra-chave: `toLowerCase()` +
   `normalize("NFD").replace(/[̀-ͯ]/g, "")` (remove acentos).
2. Para cada categoria (em ordem de `criado_em`), para cada palavra-chave
   dela: monta um `RegExp` com fronteira de palavra
   (`new RegExp('\\b' + escapeRegex(palavra) + '\\b')`), onde
   `escapeRegex` escapa todo caractere especial de regex na palavra antes
   de compilar — elimina tanto falso-positivo por substring solta (ex:
   "vava" não bate dentro de "travava") quanto qualquer risco de regex
   malformado ou comportamento inesperado vindo de uma palavra-chave
   digitada pelo usuário.
3. Primeira categoria com alguma palavra batendo vence. Sem match nenhum
   → fica com `id_categoria = null` (exibido como "Sem categoria").

Helper isolado em `src/lib/categorizacao.js`, sem I/O — recebe o nome do
lançamento e a lista de categorias (já carregada do banco) e devolve o
`id_categoria` escolhido (ou `null`).

### Onde a categorização roda

No momento em que uma transação "real" nasce — os 3 pontos que já existem:
`adicionarAvulso`, `confirmarRecorrente`, `confirmarCustoFixo`. A categoria
resolvida é gravada junto no mesmo `INSERT` (mutations `INSERIR_AVULSO` e
`INSERIR_TRANSACAO_META` ganham o parâmetro `id_categoria`). Lançamentos
antigos não são recalculados automaticamente — só a criação de novos
dispara o matching.

Escopo: entradas **e** saídas (decisão do usuário), avulso/recorrente/custo
fixo — não se aplica a `meta_aporte`, `meta_retirada`,
`investimento_aporte`, `investimento_resgate` (são movimentações internas,
não gasto/renda real).

### Edição manual

Cada linha em `ListaTransacoes` ganha um `<select>` de categoria dentro de
um `<form>` com botão "salvar" — mesmo padrão sem-JS de edição inline já
usado em `recorrentes/page.js` (nenhum client component novo precisa
existir só por causa disso). Editável mesmo com o mês fechado, já que
categoria é só um rótulo de relatório, não afeta nenhum saldo.

### Recategorizar lançamentos existentes

O usuário já tem meses de dados reais sem categoria. A tela de categorias
ganha uma action `recategorizarTudo()`: busca todas as `transacoes_mes` com
`origem` em `avulso`/`recorrente`/`custo_fixo`, roda o motor de matching
contra a lista atual de categorias, e faz um `update` em lote de
`id_categoria`. Reaproveitável também depois de editar palavras-chave.

### Tela `/categorias`

CRUD simples: criar categoria (nome), adicionar/remover palavras-chave de
uma categoria existente, remover categoria — lançamentos que apontavam pra
ela caem automaticamente pra "Sem categoria" via `ON DELETE SET NULL` na
FK (sem precisar de lógica extra na query de exibição). Botão
"recategorizar lançamentos existentes" no topo.

### Categorias pré-configuradas (seed inicial)

| Categoria | Palavras-chave |
|---|---|
| Jogo | vava, skins, jogos |
| Lazer | lazer, cinema, amigos, volei |
| Comida | ifood, lanche, sorvete |
| Transporte | onibus, 99, uber |
| Saúde/Farmácia | farmacia, remedio, drogaria |
| Mercado/Compras | comercio, mercado, supermercado |
| Assinaturas | claude, netflix, spotify, steam |
| Pessoas/Empréstimos | emprestado, dino, lana, samile |

Inserido via seed SQL na mesma migração, ou via a tela `/categorias` logo
após o deploy — a definir na implementação. Todas editáveis depois pela
tela.

## Parte 3 — Tela de gráficos (`/relatorios`)

Usa **Recharts** — primeira dependência de UI/gráfico do projeto. Só as
telas de gráfico viram client components; o resto do app continua Server
Components sem JS extra.

1. **Gasto por categoria no mês** (pizza): soma de saídas reais
   (avulso/recorrente/custo fixo) do mês navegado, agrupadas por
   categoria (incluindo "Sem categoria").
2. **Evolução mensal por categoria** (barra empilhada): últimos 6 meses,
   mesma agregação por categoria, uma barra por mês.
3. **Entradas vs saídas ao longo do tempo** (linha): reaproveita a mesma
   lógica de soma "real" (exclui `meta_aporte`/`meta_retirada`) já usada
   no Extrato por período do Painel, para todos os meses existentes.

**Seção separada — Metas e Investimentos**: gráfico de barras mostrando
total guardado por meta e total aplicado por investimento no período.
Fica visualmente separado dos gráficos de categoria de gasto (não é
misturado como se fosse uma categoria) para não distorcer "onde eu mais
gasto" com dinheiro que na verdade está guardado, não gasto.

## Segurança

- Nenhuma query usa concatenação de string SQL — tudo via variáveis
  parametrizadas do GraphQL (Hasura) ou o motor de matching em JS puro,
  que nunca vira SQL.
- Toda palavra-chave é escapada antes de virar `RegExp`
  (`escapeRegex`), eliminando risco de regex malformado ou padrão
  inesperado a partir de uma palavra-chave digitada pelo usuário.
- Migração de schema roda uma única vez, revisada com o usuário antes de
  aplicar em produção.

## Testes / verificação

Sem suíte automatizada. Verificação manual via `npm run dev` com dados
reais: criar avulso com nome que bate em categoria conhecida (ex:
"comercio") e confirmar categorização automática; criar um sem match e
confirmar "Sem categoria"; editar categoria manualmente; rodar
"recategorizar lançamentos existentes" e conferir que o histórico real
ganha categoria; abrir `/relatorios` e conferir os 3 gráficos + seção de
metas/investimentos com os dados reais.
