require("dotenv").config({ path: ".env.local" });

const NHOST_URL = process.env.NHOST_GRAPHQL_URL;
const ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET;

async function query(q, variables) {
  const res = await fetch(NHOST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": ADMIN_SECRET,
      "x-hasura-role": "henry",
    },
    body: JSON.stringify({ query: q, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

function proximoMes(dataStr) {
  const d = new Date(dataStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

async function fecharMesesAtrasados() {
  const mesRealAtual = new Date().toISOString().slice(0, 7) + "-01";

  while (true) {
    const { meses } = await query(`
      query { meses(where: {fechado: {_eq: false}}, order_by: {mes: asc}, limit: 1) { id_mes mes } }
    `);
    const mesAberto = meses[0];
    if (!mesAberto || mesAberto.mes >= mesRealAtual) break; // nada pra fechar

    // 1. snapshot dos recorrentes e custos fixos ativos
    const { recorrentes, custos_fixos } = await query(`
      query {
        recorrentes(where: {status: {_eq: true}}) { nome valor }
        custos_fixos(where: {status: {_eq: true}}) { nome valor }
      }
    `);

    const transacoes = [
      ...recorrentes.map(r => ({ id_mes: mesAberto.id_mes, nome: r.nome, valor: r.valor, tipo: "entrada", origem: "recorrente" })),
      ...custos_fixos.map(c => ({ id_mes: mesAberto.id_mes, nome: c.nome, valor: c.valor, tipo: "saida", origem: "custo_fixo" })),
    ];

    if (transacoes.length > 0) {
      await query(`
        mutation($objs: [transacoes_mes_insert_input!]!) {
          insert_transacoes_mes(objects: $objs) { affected_rows }
        }
      `, { objs: transacoes });
    }

    // 2. marca o mês como fechado
    await query(`
      mutation($id: uuid!) { update_meses_by_pk(pk_columns: {id_mes: $id}, _set: {fechado: true}) { id_mes } }
    `, { id: mesAberto.id_mes });

    // 3. abre o próximo mês
    const novoMes = proximoMes(mesAberto.mes);
    await query(`
      mutation($mes: date!) { insert_meses_one(object: {mes: $mes, fechado: false}, on_conflict: {constraint: meses_mes_key, update_columns: []}) { id_mes } }
    `, { mes: novoMes });

    console.log(`Mês ${mesAberto.mes} fechado. Mês ${novoMes} aberto.`);

    // gera as parcelas do novo mês
    const { parcelamentos } = await query(`
      query { parcelamentos(where: {ativo: {_eq: true}, proximo_mes: {_eq: "${novoMes}"}}) { id_parcelamento descricao valor_parcela qtd_parcelas parcelas_pagas } }
    `);

    const { meses: novoMesRow } = await query(`
      query { meses(where: {mes: {_eq: "${novoMes}"}}) { id_mes } }
    `);
    const id_mes_novo = novoMesRow[0].id_mes;

    for (const p of parcelamentos) {
      const novaContagem = p.parcelas_pagas + 1;
      await query(`
        mutation($id_mes: uuid!, $nome: String!, $valor: numeric!) {
          insert_transacoes_mes_one(object: {id_mes: $id_mes, nome: $nome, valor: $valor, tipo: "saida", origem: "parcelamento"}) { id_transacao }
        }
      `, { id_mes: id_mes_novo, nome: `Parcela ${novaContagem}/${p.qtd_parcelas}: ${p.descricao}`, valor: p.valor_parcela });

      const finalizado = novaContagem >= p.qtd_parcelas;
      await query(`
        mutation($id: uuid!, $pagas: Int!, $ativo: Boolean!, $proximo: date) {
          update_parcelamentos_by_pk(pk_columns: {id_parcelamento: $id}, _set: {parcelas_pagas: $pagas, ativo: $ativo, proximo_mes: $proximo}) { id_parcelamento }
        }
      `, { id: p.id_parcelamento, pagas: novaContagem, ativo: !finalizado, proximo: finalizado ? null : proximoMes(novoMes) });

      if (finalizado) {
        // marca o item de meta vinculado (se existir) como comprado
        await query(`
          mutation($id_parc: uuid!) {
            update_meta_itens(where: {id_parcelamento: {_eq: $id_parc}}, _set: {comprado: true}) { affected_rows }
          }
        `, { id_parc: p.id_parcelamento });
      }
    }
  }
}

fecharMesesAtrasados().catch(console.error);