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
      transacoes_mes { valor tipo origem }
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

export const META_COM_ITENS = `
  query MetaComItens($id: uuid!) {
    metas_by_pk(id_meta: $id) { id_meta nome meta valor_atual }
    meta_itens(where: { id_meta: { _eq: $id } }, order_by: { criado_em: asc }) {
      id_item nome valor_planejado comprado id_parcelamento
      parcelamento {
        valor_parcela qtd_parcelas parcelas_pagas ativo proximo_mes
      }
    }
  }
`;

export const INSERIR_ITEM_META = `
  mutation InserirItemMeta($id_meta: uuid!, $nome: String!, $valor_planejado: numeric!) {
    insert_meta_itens_one(object: { id_meta: $id_meta, nome: $nome, valor_planejado: $valor_planejado }) { id_item }
  }
`;

export const TOGGLE_ITEM_COMPRADO = `
  mutation ToggleItemComprado($id: uuid!, $comprado: Boolean!) {
    update_meta_itens_by_pk(pk_columns: { id_item: $id }, _set: { comprado: $comprado }) { id_item }
  }
`;

export const INVESTIMENTOS = `
  query Investimentos {
    investimentos(order_by: { nome: asc }) {
      id_investimento nome tipo valor_atual percentual_cdi cdi_atual
    }
  }
`;

export const RESGATAR_INVESTIMENTO = `
  mutation ResgatarInvestimento($id: uuid!, $valor_resgatado: numeric!) {
    update_investimentos_by_pk(pk_columns: { id_investimento: $id }, _set: { resgatado: true, valor_resgatado: $valor_resgatado, data_resgate: "now()" }) { id_investimento }
  }
`;

export const EDITAR_ITEM_META = `
  mutation EditarItemMeta($id: uuid!, $nome: String!, $valor_planejado: numeric!) {
    update_meta_itens_by_pk(pk_columns: { id_item: $id }, _set: { nome: $nome, valor_planejado: $valor_planejado }) { id_item }
  }
`;

export const INSERIR_PARCELAMENTO = `
  mutation InserirParcelamento($descricao: String!, $valor_parcela: numeric!, $qtd_parcelas: Int!, $proximo_mes: date!) {
    insert_parcelamentos_one(object: { descricao: $descricao, valor_parcela: $valor_parcela, qtd_parcelas: $qtd_parcelas, proximo_mes: $proximo_mes }) { id_parcelamento }
  }
`;

export const VINCULAR_PARCELAMENTO_ITEM = `
  mutation VincularParcelamentoItem($id_item: uuid!, $id_parcelamento: uuid!) {
    update_meta_itens_by_pk(pk_columns: { id_item: $id_item }, _set: { id_parcelamento: $id_parcelamento }) { id_item }
  }
`;

export const PARCELAMENTOS_ATIVOS = `
  query ParcelamentosAtivos {
    parcelamentos(where: { ativo: { _eq: true } }, order_by: { criado_em: desc }) {
      id_parcelamento descricao valor_parcela qtd_parcelas parcelas_pagas proximo_mes
    }
  }
`;

export const INVESTIMENTO_BY_ID = `
  query InvestimentoById($id: uuid!) {
    investimentos_by_pk(id_investimento: $id) { id_investimento nome tipo valor_atual percentual_cdi cdi_atual }
  }
`;

export const GUARDAR_NO_INVESTIMENTO = `
  mutation GuardarNoInvestimento($id: uuid!, $valor: numeric!) {
    update_investimentos_by_pk(pk_columns: { id_investimento: $id }, _inc: { valor_atual: $valor }) { id_investimento valor_atual }
  }
`;

export const SET_VALOR_INVESTIMENTO = `
  mutation SetValorInvestimento($id: uuid!, $valor_atual: numeric!) {
    update_investimentos_by_pk(pk_columns: { id_investimento: $id }, _set: { valor_atual: $valor_atual }) { id_investimento }
  }
`;

export const ATUALIZAR_TAXA_INVESTIMENTO = `
  mutation AtualizarTaxaInvestimento($id: uuid!, $percentual_cdi: numeric!, $cdi_atual: numeric!) {
    update_investimentos_by_pk(pk_columns: { id_investimento: $id }, _set: { percentual_cdi: $percentual_cdi, cdi_atual: $cdi_atual }) { id_investimento }
  }
`;

export const TRANSACOES_INVESTIMENTO = `
  query TransacoesInvestimento($id: uuid!) {
    transacoes_mes(where: { id_investimento: { _eq: $id } }, order_by: { id_transacao: desc }) {
      id_transacao nome valor tipo
      mes { mes }
    }
  }
`;

export const INSERIR_TRANSACAO_INVESTIMENTO = `
  mutation InserirTransacaoInvestimento($id_mes: uuid!, $id_investimento: uuid!, $nome: String!, $valor: numeric!, $tipo: String!, $origem: String!) {
    insert_transacoes_mes_one(object: { id_mes: $id_mes, id_investimento: $id_investimento, nome: $nome, valor: $valor, tipo: $tipo, origem: $origem }) { id_transacao }
  }
`;
