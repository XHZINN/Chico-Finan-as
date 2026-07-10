export const DADOS_MES = `
  query DadosMes($mes: date!) {
    meses(where: { mes: { _eq: $mes } }) {
      id_mes
      fechado
    }
    recorrentes(where: { status: { _eq: true } }) {
      id_recorrente nome valor
    }
    custos_fixos(where: { status: { _eq: true } }) {
      id_custo_fx nome valor
    }
  }
`;

export const TRANSACOES_MES_FECHADO = `
  query TransacoesMesFechado($id_mes: uuid!) {
    transacoes_mes(where: { id_mes: { _eq: $id_mes } }) {
      id_transacao nome valor tipo origem
    }
  }
`;

export const METAS = `
  query Metas {
    metas { id_meta nome meta valor_atual }
  }
`;

export const INSERIR_AVULSO = `
  mutation InserirAvulso($id_mes: uuid!, $nome: String!, $valor: numeric!, $tipo: String!) {
    insert_transacoes_mes_one(object: { id_mes: $id_mes, nome: $nome, valor: $valor, tipo: $tipo, origem: "avulso" }) { id_transacao }
  }
`;

export const INSERIR_RECORRENTE = `
  mutation InserirRecorrente($nome: String!, $valor: numeric!) {
    insert_recorrentes_one(object: { nome: $nome, valor: $valor }) { id_recorrente }
  }
`;

export const INSERIR_CUSTO_FIXO = `
  mutation InserirCustoFixo($nome: String!, $valor: numeric!) {
    insert_custos_fixos_one(object: { nome: $nome, valor: $valor }) { id_custo_fx }
  }
`;

export const TOGGLE_RECORRENTE = `
  mutation ToggleRecorrente($id: uuid!, $status: Boolean!) {
    update_recorrentes_by_pk(pk_columns: { id_recorrente: $id }, _set: { status: $status }) { id_recorrente }
  }
`;

export const TOGGLE_CUSTO_FIXO = `
  mutation ToggleCustoFixo($id: uuid!, $status: Boolean!) {
    update_custos_fixos_by_pk(pk_columns: { id_custo_fx: $id }, _set: { status: $status }) { id_custo_fx }
  }
`;

export const INSERIR_META = `
  mutation InserirMeta($nome: String!, $meta: numeric!) {
    insert_metas_one(object: { nome: $nome, meta: $meta, valor_atual: 0 }) { id_meta }
  }
`;

export const GUARDAR_NA_META = `
  mutation GuardarNaMeta($id: uuid!, $valor: numeric!) {
    update_metas_by_pk(pk_columns: { id_meta: $id }, _inc: { valor_atual: $valor }) { id_meta valor_atual }
  }
`;

export const DELETAR_META = `mutation($id: uuid!) { delete_metas_by_pk(id_meta: $id) { id_meta } }`;
export const DELETAR_AVULSO = `mutation($id: uuid!) { delete_transacoes_mes_by_pk(id_transacao: $id) { id_transacao } }`;

export const MES_INFO = `
  query MesInfo($mes: date!) {
    meses(where: { mes: { _eq: $mes } }) { id_mes mes fechado }
  }
`;

export const TRANSACOES_DO_MES = `
  query TransacoesDoMes($id_mes: uuid!) {
    transacoes_mes(where: { id_mes: { _eq: $id_mes } }) {
      id_transacao nome valor tipo origem
    }
  }
`;

export const ATIVOS = `
  query Ativos {
    recorrentes(where: { status: { _eq: true } }) { id_recorrente nome valor }
    custos_fixos(where: { status: { _eq: true } }) { id_custo_fx nome valor }
  }
`;

export const TODOS_RECORRENTES_CUSTOS = `
  query Todos {
    recorrentes(order_by: { criado_em: desc }) { id_recorrente nome valor status }
    custos_fixos(order_by: { criado_em: desc }) { id_custo_fx nome valor status }
  }
`;

export const EXTRATO_RANGE = `
  query ExtratoRange($inicio: date!, $fim: date!) {
    meses(where: { mes: { _gte: $inicio, _lte: $fim } }, order_by: { mes: asc }) {
      id_mes
      mes
      fechado
      transacoes_mes { valor tipo }
    }
  }
`;

export const META_BY_ID = `
  query MetaById($id: uuid!) {
    metas_by_pk(id_meta: $id) { id_meta valor_atual meta }
  }
`;

export const INSERIR_TRANSACAO_META = `
  mutation InserirTransacaoMeta($id_mes: uuid!, $nome: String!, $valor: numeric!, $tipo: String!, $origem: String!) {
    insert_transacoes_mes_one(object: { id_mes: $id_mes, nome: $nome, valor: $valor, tipo: $tipo, origem: $origem }) { id_transacao }
  }
`;