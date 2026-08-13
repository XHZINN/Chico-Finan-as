"use server";

import { redirect } from "next/navigation";
import { nhostQuery } from "@/lib/nhost";
import { categorizar } from "@/lib/categorizacao";
import {
  INSERIR_AVULSO, INSERIR_RECORRENTE, INSERIR_CUSTO_FIXO,
  TOGGLE_RECORRENTE, TOGGLE_CUSTO_FIXO, EDITAR_RECORRENTE, EDITAR_CUSTO_FIXO, META_BY_ID,
  INSERIR_TRANSACAO_META, INSERIR_META, GUARDAR_NA_META,
  DELETAR_META, DELETAR_AVULSO, EDITAR_ITEM_META, INSERIR_ITEM_META,
  META_COM_ITENS, TOGGLE_ITEM_COMPRADO, INSERIR_PARCELAMENTO, VINCULAR_PARCELAMENTO_ITEM,
  INVESTIMENTO_BY_ID, GUARDAR_NO_INVESTIMENTO, SET_VALOR_INVESTIMENTO,
  ATUALIZAR_TAXA_INVESTIMENTO, INSERIR_TRANSACAO_INVESTIMENTO, INSERIR_INVESTIMENTO,
  CATEGORIAS_COM_PALAVRAS, INSERIR_CATEGORIA, DELETAR_CATEGORIA, ADICIONAR_PALAVRA, REMOVER_PALAVRA,
  TRANSACOES_PARA_RECATEGORIZAR, ATUALIZAR_CATEGORIA_TRANSACAO,
} from "@/lib/queries";
import { revalidatePath } from "next/cache";

function valorValido(v) {
  return typeof v === "number" && !Number.isNaN(v) && v > 0;
}

function proximoMes(mesYYYYMM) {
  const d = new Date(mesYYYYMM + "-01T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// aceita valor_parcela OU valor_total (formData) + qtd_parcelas, devolve o valor da parcela
function resolverValorParcela(formData, qtd_parcelas) {
  const valorParcelaInput = formData.get("valor_parcela");
  if (valorParcelaInput) return Math.round(parseFloat(valorParcelaInput) * 100) / 100;
  const valorTotal = parseFloat(formData.get("valor_total"));
  return Math.round((valorTotal / qtd_parcelas) * 100) / 100;
}

async function resolverCategoria(nome, tipo) {
  const { categorias } = await nhostQuery(CATEGORIAS_COM_PALAVRAS);
  return categorizar(nome, categorias.filter(c => c.tipo === tipo));
}

export async function adicionarAvulso(formData) {
  const id_mes = formData.get("id_mes");
  const nome = formData.get("nome");
  const valor = parseFloat(formData.get("valor"));
  const tipo = formData.get("tipo");
  const mes = formData.get("mes");

  if (!valorValido(valor)) redirect(`/?mes=${mes}&erro=valor_invalido`);

  const id_categoria = await resolverCategoria(nome, tipo);
  await nhostQuery(INSERIR_AVULSO, { id_mes, nome, valor, tipo, id_categoria });
  revalidatePath("/");
}

export async function adicionarRecorrente(formData) {
  const nome = formData.get("nome");
  const valor = parseFloat(formData.get("valor"));

  if (!valorValido(valor)) redirect(`/recorrentes?erro=valor_invalido`);

  await nhostQuery(INSERIR_RECORRENTE, { nome, valor });
  revalidatePath("/recorrentes");
  revalidatePath("/");
}

export async function adicionarCustoFixo(formData) {
  const nome = formData.get("nome");
  const valor = parseFloat(formData.get("valor"));

  if (!valorValido(valor)) redirect(`/recorrentes?erro=valor_invalido`);

  await nhostQuery(INSERIR_CUSTO_FIXO, { nome, valor });
  revalidatePath("/recorrentes");
  revalidatePath("/");
}

export async function confirmarRecorrente(formData) {
  const id_mes = formData.get("id_mes");
  const nome = formData.get("nome");
  const valor = parseFloat(formData.get("valor"));
  const mes = formData.get("mes");

  if (!valorValido(valor)) redirect(`/?mes=${mes}&erro=valor_invalido`);

  const id_categoria = await resolverCategoria(nome, "entrada");
  await nhostQuery(INSERIR_TRANSACAO_META, { id_mes, nome, valor, tipo: "entrada", origem: "recorrente", id_categoria });
  revalidatePath("/");
}

export async function confirmarCustoFixo(formData) {
  const id_mes = formData.get("id_mes");
  const nome = formData.get("nome");
  const valor = parseFloat(formData.get("valor"));
  const mes = formData.get("mes");

  if (!valorValido(valor)) redirect(`/?mes=${mes}&erro=valor_invalido`);

  const id_categoria = await resolverCategoria(nome, "saida");
  await nhostQuery(INSERIR_TRANSACAO_META, { id_mes, nome, valor, tipo: "saida", origem: "custo_fixo", id_categoria });
  revalidatePath("/");
}

export async function toggleRecorrente(formData) {
  const id = formData.get("id");
  const status = formData.get("status") === "true";
  await nhostQuery(TOGGLE_RECORRENTE, { id, status: !status });
  revalidatePath("/recorrentes");
  revalidatePath("/");
}

export async function toggleCustoFixo(formData) {
  const id = formData.get("id");
  const status = formData.get("status") === "true";
  await nhostQuery(TOGGLE_CUSTO_FIXO, { id, status: !status });
  revalidatePath("/recorrentes");
  revalidatePath("/");
}

export async function editarRecorrente(formData) {
  const id = formData.get("id");
  const nome = formData.get("nome");
  const valor = parseFloat(formData.get("valor"));

  if (!valorValido(valor)) redirect(`/recorrentes?erro=valor_invalido`);

  await nhostQuery(EDITAR_RECORRENTE, { id, nome, valor });
  revalidatePath("/recorrentes");
  revalidatePath("/");
  redirect(`/recorrentes`);
}

export async function editarCustoFixo(formData) {
  const id = formData.get("id");
  const nome = formData.get("nome");
  const valor = parseFloat(formData.get("valor"));

  if (!valorValido(valor)) redirect(`/recorrentes?erro=valor_invalido`);

  await nhostQuery(EDITAR_CUSTO_FIXO, { id, nome, valor });
  revalidatePath("/recorrentes");
  revalidatePath("/");
  redirect(`/recorrentes`);
}

export async function adicionarMeta(formData) {
  const nome = formData.get("nome");
  const meta = parseFloat(formData.get("meta"));

  if (!valorValido(meta)) redirect(`/metas?erro=valor_invalido`);

  await nhostQuery(INSERIR_META, { nome, meta });
  revalidatePath("/metas");
}

export async function guardarNaMeta(formData) {
  const id = formData.get("id");
  const nomeMeta = formData.get("nome_meta");
  const valor = parseFloat(formData.get("valor"));
  const id_mes = formData.get("id_mes");

  if (!valorValido(valor)) redirect(`/metas?erro=valor_invalido`);

  const { metas_by_pk } = await nhostQuery(META_BY_ID, { id });
  if (!metas_by_pk) redirect(`/metas?erro=meta_invalida`);

  const novoValor = Number(metas_by_pk.valor_atual) + valor;
  if (novoValor > Number(metas_by_pk.meta)) {
    redirect(`/metas?erro=aporte_excede`);
  }

  await nhostQuery(INSERIR_TRANSACAO_META, {
    id_mes, nome: `Aporte meta: ${nomeMeta}`, valor, tipo: "saida", origem: "meta_aporte",
  });
  await nhostQuery(GUARDAR_NA_META, { id, valor });

  revalidatePath("/metas");
  revalidatePath("/");
  redirect(`/metas`);
}

export async function retirarDaMeta(formData) {
  const id = formData.get("id");
  const nomeMeta = formData.get("nome_meta");
  const valor = parseFloat(formData.get("valor"));
  const id_mes = formData.get("id_mes");

  if (!valorValido(valor)) redirect(`/metas?erro=valor_invalido`);

  const { metas_by_pk } = await nhostQuery(META_BY_ID, { id });
  if (!metas_by_pk || Number(metas_by_pk.valor_atual) < valor) {
    redirect(`/metas?erro=retirada`);
  }

  await nhostQuery(INSERIR_TRANSACAO_META, {
    id_mes, nome: `Retirada meta: ${nomeMeta}`, valor, tipo: "entrada", origem: "meta_retirada",
  });
  await nhostQuery(GUARDAR_NA_META, { id, valor: -valor });

  revalidatePath("/metas");
  revalidatePath("/");
  redirect(`/metas`);
}

export async function deletarMeta(formData) {
  await nhostQuery(DELETAR_META, { id: formData.get("id") });
  revalidatePath("/metas");
}

export async function deletarAvulso(formData) {
  await nhostQuery(DELETAR_AVULSO, { id: formData.get("id") });
  revalidatePath("/");
}

export async function adicionarItemMeta(formData) {
  const id_meta = formData.get("id_meta");
  const nome = formData.get("nome");
  const valor_planejado = parseFloat(formData.get("valor_planejado"));

  if (!valorValido(valor_planejado)) redirect(`/metas/${id_meta}?erro=valor_invalido`);

  const { metas_by_pk, meta_itens } = await nhostQuery(META_COM_ITENS, { id: id_meta });
  const somaAtual = meta_itens.reduce((s, i) => s + Number(i.valor_planejado), 0);

  if (somaAtual + valor_planejado > Number(metas_by_pk.meta)) {
    redirect(`/metas/${id_meta}?erro=item_excede`);
  }

  await nhostQuery(INSERIR_ITEM_META, { id_meta, nome, valor_planejado });
  revalidatePath(`/metas/${id_meta}`);
}

export async function toggleItemComprado(formData) {
  const id_item = formData.get("id_item");
  const id_meta = formData.get("id_meta");
  const nome_item = formData.get("nome_item");
  const valor = parseFloat(formData.get("valor"));
  const comprado = formData.get("comprado") === "true";
  const id_mes = formData.get("id_mes");

  if (!comprado) {
    const { metas_by_pk } = await nhostQuery(META_BY_ID, { id: id_meta });
    if (Number(metas_by_pk.valor_atual) < valor) {
      redirect(`/metas/${id_meta}?erro=saldo_insuficiente`);
    }
  }

  await nhostQuery(TOGGLE_ITEM_COMPRADO, { id: id_item, comprado: !comprado });

  if (!comprado) {
    await nhostQuery(INSERIR_TRANSACAO_META, {
      id_mes, nome: `Saída meta: ${nome_item}`, valor, tipo: "saida", origem: "meta_compra",
    });
    await nhostQuery(GUARDAR_NA_META, { id: id_meta, valor: -valor });
  } else {
    await nhostQuery(INSERIR_TRANSACAO_META, {
      id_mes, nome: `Estorno: ${nome_item}`, valor, tipo: "entrada", origem: "meta_compra",
    });
    await nhostQuery(GUARDAR_NA_META, { id: id_meta, valor: valor });
  }

  revalidatePath(`/metas/${id_meta}`);
  revalidatePath("/");
}

export async function editarItemMeta(formData) {
  const id = formData.get("id");
  const id_meta = formData.get("id_meta");
  const nome = formData.get("nome");
  const valor_planejado = parseFloat(formData.get("valor_planejado"));

  if (!valorValido(valor_planejado)) redirect(`/metas/${id_meta}?erro=valor_invalido`);

  const { metas_by_pk, meta_itens } = await nhostQuery(META_COM_ITENS, { id: id_meta });
  const somaOutros = meta_itens.filter(i => i.id_item !== id).reduce((s, i) => s + Number(i.valor_planejado), 0);

  if (somaOutros + valor_planejado > Number(metas_by_pk.meta)) {
    redirect(`/metas/${id_meta}?erro=item_excede`);
  }

  await nhostQuery(EDITAR_ITEM_META, { id, nome, valor_planejado });
  revalidatePath(`/metas/${id_meta}`);
  redirect(`/metas/${id_meta}`);
}

export async function comprarItemParcelado(formData) {
  const id_item = formData.get("id_item");
  const id_meta = formData.get("id_meta");
  const nome_item = formData.get("nome_item");
  const qtd_parcelas = parseInt(formData.get("qtd_parcelas"));
  const mes = formData.get("mes");

  const valor_parcela = resolverValorParcela(formData, qtd_parcelas);

  if (!valorValido(valor_parcela) || !Number.isInteger(qtd_parcelas) || qtd_parcelas < 1) {
    redirect(`/metas/${id_meta}?erro=valor_invalido`);
  }

  const { insert_parcelamentos_one } = await nhostQuery(INSERIR_PARCELAMENTO, {
    descricao: nome_item, valor_parcela, qtd_parcelas, proximo_mes: proximoMes(mes),
  });
  const id_parcelamento = insert_parcelamentos_one.id_parcelamento;

  await nhostQuery(VINCULAR_PARCELAMENTO_ITEM, { id_item, id_parcelamento });

  // nenhuma parcela é cobrada agora — a 1ª parcela só entra no mês seguinte,
  // quando o fechamento de mês rola o parcelamento (mesma lógica das demais)
  revalidatePath(`/metas/${id_meta}`);
}

export async function comprarAvulsoParcelado(formData) {
  const nome = formData.get("nome");
  const qtd_parcelas = parseInt(formData.get("qtd_parcelas"));
  const mes = formData.get("mes");

  const valor_parcela = resolverValorParcela(formData, qtd_parcelas);

  if (!nome || !valorValido(valor_parcela) || !Number.isInteger(qtd_parcelas) || qtd_parcelas < 1) {
    redirect(`/?mes=${mes}&erro=valor_invalido`);
  }

  await nhostQuery(INSERIR_PARCELAMENTO, {
    descricao: nome, valor_parcela, qtd_parcelas, proximo_mes: proximoMes(mes),
  });

  // nenhuma parcela é cobrada agora — a 1ª parcela só entra no mês seguinte
  revalidatePath("/");
}

export async function adicionarInvestimento(formData) {
  const nome = formData.get("nome");
  const tipo = formData.get("tipo")?.toLowerCase();
  const valor = parseFloat(formData.get("valor"));
  const id_mes = formData.get("id_mes");

  if (!valorValido(valor)) redirect(`/investimentos?erro=valor_invalido`);

  const { insert_investimentos_one } = await nhostQuery(INSERIR_INVESTIMENTO, {
    nome, tipo, valor_investido: valor,
  });

  await nhostQuery(INSERIR_TRANSACAO_INVESTIMENTO, {
    id_mes, id_investimento: insert_investimentos_one.id_investimento,
    nome: `Aplicação: ${nome}`, valor, tipo: "saida", origem: "investimento_aporte",
  });

  revalidatePath("/investimentos");
  revalidatePath("/");
  redirect(`/investimentos`);
}

export async function guardarNoInvestimento(formData) {
  const id = formData.get("id");
  const nome = formData.get("nome");
  const valor = parseFloat(formData.get("valor"));
  const id_mes = formData.get("id_mes");
  const redirectTo = formData.get("redirect_to") || "/investimentos";

  if (!valorValido(valor)) redirect(`${redirectTo}?erro=valor_invalido`);

  await nhostQuery(INSERIR_TRANSACAO_INVESTIMENTO, {
    id_mes, id_investimento: id, nome: `Guardado em: ${nome}`, valor, tipo: "saida", origem: "investimento_aporte",
  });
  await nhostQuery(GUARDAR_NO_INVESTIMENTO, { id, valor });

  revalidatePath("/");
  revalidatePath("/investimentos");
  revalidatePath(`/investimentos/${id}`);
  redirect(redirectTo);
}

export async function retirarDoInvestimento(formData) {
  const id = formData.get("id");
  const nome = formData.get("nome");
  const valorSolicitado = parseFloat(formData.get("valor"));
  const id_mes = formData.get("id_mes");
  const redirectTo = formData.get("redirect_to") || "/investimentos";

  if (!valorValido(valorSolicitado)) redirect(`${redirectTo}?erro=valor_invalido`);

  const { investimentos_by_pk } = await nhostQuery(INVESTIMENTO_BY_ID, { id });
  const disponivel = Number(investimentos_by_pk.valor_atual);
  const valorRetirado = Math.min(valorSolicitado, disponivel); // nunca negativa, só zera

  await nhostQuery(INSERIR_TRANSACAO_INVESTIMENTO, {
    id_mes, id_investimento: id, nome: `Retirada de: ${nome}`, valor: valorRetirado, tipo: "entrada", origem: "investimento_resgate",
  });
  await nhostQuery(SET_VALOR_INVESTIMENTO, { id, valor_atual: disponivel - valorRetirado });

  revalidatePath("/");
  revalidatePath("/investimentos");
  revalidatePath(`/investimentos/${id}`);
  redirect(redirectTo);
}

export async function atualizarValorInvestimento(formData) {
  const id = formData.get("id");
  const valor_atual = parseFloat(formData.get("valor_atual"));

  await nhostQuery(SET_VALOR_INVESTIMENTO, { id, valor_atual });

  revalidatePath("/");
  revalidatePath("/investimentos");
  revalidatePath(`/investimentos/${id}`);
}

export async function atualizarTaxaInvestimento(formData) {
  const id = formData.get("id");
  const percentual_cdi = parseFloat(formData.get("percentual_cdi"));
  const cdi_atual = parseFloat(formData.get("cdi_atual"));

  await nhostQuery(ATUALIZAR_TAXA_INVESTIMENTO, { id, percentual_cdi, cdi_atual });

  revalidatePath("/investimentos");
  revalidatePath(`/investimentos/${id}`);
}

export async function criarCategoria(formData) {
  const nome = (formData.get("nome") || "").trim();
  const tipo = formData.get("tipo") === "entrada" ? "entrada" : "saida";
  if (!nome) redirect(`/categorias?erro=valor_invalido`);

  await nhostQuery(INSERIR_CATEGORIA, { nome, tipo });
  revalidatePath("/categorias");
}

export async function deletarCategoria(formData) {
  const id = formData.get("id");
  await nhostQuery(DELETAR_CATEGORIA, { id });
  revalidatePath("/categorias");
  revalidatePath("/");
}

export async function adicionarPalavra(formData) {
  const id_categoria = formData.get("id_categoria");
  const palavra = (formData.get("palavra") || "").trim().toLowerCase();
  if (!palavra) redirect(`/categorias?erro=valor_invalido`);

  await nhostQuery(ADICIONAR_PALAVRA, { id_categoria, palavra });
  revalidatePath("/categorias");
}

export async function removerPalavra(formData) {
  const id_categoria = formData.get("id_categoria");
  const palavra = formData.get("palavra");
  await nhostQuery(REMOVER_PALAVRA, { id_categoria, palavra });
  revalidatePath("/categorias");
}

export async function recategorizarTudo() {
  // TRANSACOES_PARA_RECATEGORIZAR já filtra id_categoria nulo — preserva
  // qualquer categoria já atribuída (manual ou automática) sem sobrescrever
  const { categorias } = await nhostQuery(CATEGORIAS_COM_PALAVRAS);
  const { transacoes_mes } = await nhostQuery(TRANSACOES_PARA_RECATEGORIZAR);

  for (const t of transacoes_mes) {
    const id_categoria = categorizar(t.nome, categorias.filter(c => c.tipo === t.tipo));
    await nhostQuery(ATUALIZAR_CATEGORIA_TRANSACAO, { id: t.id_transacao, id_categoria });
  }

  revalidatePath("/categorias");
  revalidatePath("/");
  revalidatePath("/relatorios");
}

export async function atualizarCategoriaTransacao(formData) {
  const id = formData.get("id");
  const id_categoria = formData.get("id_categoria") || null;
  await nhostQuery(ATUALIZAR_CATEGORIA_TRANSACAO, { id, id_categoria });
  revalidatePath("/");
  revalidatePath("/relatorios");
}