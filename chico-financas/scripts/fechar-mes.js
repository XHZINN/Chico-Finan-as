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
  }
}

fecharMesesAtrasados().catch(console.error);