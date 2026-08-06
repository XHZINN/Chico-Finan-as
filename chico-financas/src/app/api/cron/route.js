import { NextResponse } from "next/server";
import { nhostQuery } from "@/lib/nhost";

const PROXIMO_MES_ABERTO = `
  query ProximoMesAberto {
    meses(where: { fechado: { _eq: false } }, order_by: { mes: asc }, limit: 1) { id_mes mes }
  }
`;

const ATIVOS_PARA_FECHAMENTO = `
  query AtivosParaFechamento {
    recorrentes(where: { status: { _eq: true } }) { nome valor }
    custos_fixos(where: { status: { _eq: true } }) { nome valor }
  }
`;

const INSERIR_TRANSACOES_FECHAMENTO = `
  mutation InserirTransacoesFechamento($objs: [transacoes_mes_insert_input!]!) {
    insert_transacoes_mes(objects: $objs) { affected_rows }
  }
`;

const FECHAR_MES = `
  mutation FecharMes($id: uuid!) {
    update_meses_by_pk(pk_columns: { id_mes: $id }, _set: { fechado: true }) { id_mes }
  }
`;

const ABRIR_MES = `
  mutation AbrirMes($mes: date!) {
    insert_meses_one(object: { mes: $mes, fechado: false }, on_conflict: { constraint: meses_mes_key, update_columns: [] }) { id_mes }
  }
`;

const MES_POR_DATA = `
  query MesPorData($mes: date!) {
    meses(where: { mes: { _eq: $mes } }) { id_mes }
  }
`;

const PARCELAMENTOS_DO_MES = `
  query ParcelamentosDoMes($proximo_mes: date!) {
    parcelamentos(where: { ativo: { _eq: true }, proximo_mes: { _eq: $proximo_mes } }) {
      id_parcelamento descricao valor_parcela qtd_parcelas parcelas_pagas
    }
  }
`;

const INSERIR_PARCELA = `
  mutation InserirParcela($id_mes: uuid!, $nome: String!, $valor: numeric!) {
    insert_transacoes_mes_one(object: { id_mes: $id_mes, nome: $nome, valor: $valor, tipo: "saida", origem: "parcelamento" }) { id_transacao }
  }
`;

const ATUALIZAR_PARCELAMENTO = `
  mutation AtualizarParcelamento($id: uuid!, $pagas: Int!, $ativo: Boolean!, $proximo: date) {
    update_parcelamentos_by_pk(pk_columns: { id_parcelamento: $id }, _set: { parcelas_pagas: $pagas, ativo: $ativo, proximo_mes: $proximo }) { id_parcelamento }
  }
`;

const FINALIZAR_ITENS_META_DO_PARCELAMENTO = `
  mutation FinalizarItensMetaDoParcelamento($id_parc: uuid!) {
    update_meta_itens(where: { id_parcelamento: { _eq: $id_parc } }, _set: { comprado: true }) { affected_rows }
  }
`;

function proximoMes(dataStr) {
  const d = new Date(dataStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

async function fecharMesesAtrasados() {
  const mesRealAtual = new Date().toISOString().slice(0, 7) + "-01";
  const mesesFechados = [];

  while (true) {
    const { meses } = await nhostQuery(PROXIMO_MES_ABERTO);
    const mesAberto = meses[0];
    if (!mesAberto || mesAberto.mes >= mesRealAtual) break;

    const { recorrentes, custos_fixos } = await nhostQuery(ATIVOS_PARA_FECHAMENTO);
    const transacoes = [
      ...recorrentes.map(r => ({ id_mes: mesAberto.id_mes, nome: r.nome, valor: r.valor, tipo: "entrada", origem: "recorrente" })),
      ...custos_fixos.map(c => ({ id_mes: mesAberto.id_mes, nome: c.nome, valor: c.valor, tipo: "saida", origem: "custo_fixo" })),
    ];

    if (transacoes.length > 0) {
      await nhostQuery(INSERIR_TRANSACOES_FECHAMENTO, { objs: transacoes });
    }

    await nhostQuery(FECHAR_MES, { id: mesAberto.id_mes });

    const novoMes = proximoMes(mesAberto.mes);
    await nhostQuery(ABRIR_MES, { mes: novoMes });

    const { meses: novoMesRow } = await nhostQuery(MES_POR_DATA, { mes: novoMes });
    const id_mes_novo = novoMesRow[0].id_mes;

    const { parcelamentos } = await nhostQuery(PARCELAMENTOS_DO_MES, { proximo_mes: novoMes });

    for (const p of parcelamentos) {
      const novaContagem = p.parcelas_pagas + 1;
      await nhostQuery(INSERIR_PARCELA, {
        id_mes: id_mes_novo,
        nome: `Parcela ${novaContagem}/${p.qtd_parcelas}: ${p.descricao}`,
        valor: p.valor_parcela,
      });

      const finalizado = novaContagem >= p.qtd_parcelas;
      await nhostQuery(ATUALIZAR_PARCELAMENTO, {
        id: p.id_parcelamento,
        pagas: novaContagem,
        ativo: !finalizado,
        proximo: finalizado ? null : proximoMes(novoMes),
      });

      if (finalizado) {
        await nhostQuery(FINALIZAR_ITENS_META_DO_PARCELAMENTO, { id_parc: p.id_parcelamento });
      }
    }

    mesesFechados.push(mesAberto.mes);
  }

  return mesesFechados;
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const mesesFechados = await fecharMesesAtrasados();

  return NextResponse.json({ ok: true, mesesFechados });
}
