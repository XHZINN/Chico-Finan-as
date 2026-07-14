"use server";

import { redirect } from "next/navigation";
import { nhostQuery } from "@/lib/nhost";
import {
  INSERIR_AVULSO, INSERIR_RECORRENTE, INSERIR_CUSTO_FIXO,
  TOGGLE_RECORRENTE, TOGGLE_CUSTO_FIXO, META_BY_ID,
  INSERIR_TRANSACAO_META, INSERIR_META, GUARDAR_NA_META,
  DELETAR_META, DELETAR_AVULSO, EDITAR_ITEM_META, INSERIR_ITEM_META,
  META_COM_ITENS, TOGGLE_ITEM_COMPRADO, INSERIR_INVESTIMENTO, RESGATAR_INVESTIMENTO,
  INSERIR_PARCELAMENTO, VINCULAR_PARCELAMENTO_ITEM,
} from "@/lib/queries";
import { revalidatePath } from "next/cache";

export async function adicionarAvulso(formData) {
  const id_mes = formData.get("id_mes");
  const nome = formData.get("nome");
  const valor = parseFloat(formData.get("valor"));
  const tipo = formData.get("tipo");
  await nhostQuery(INSERIR_AVULSO, { id_mes, nome, valor, tipo });
  revalidatePath("/");
}

export async function adicionarRecorrente(formData) {
  const nome = formData.get("nome");
  const valor = parseFloat(formData.get("valor"));
  await nhostQuery(INSERIR_RECORRENTE, { nome, valor });
  revalidatePath("/");
}

export async function adicionarCustoFixo(formData) {
  const nome = formData.get("nome");
  const valor = parseFloat(formData.get("valor"));
  await nhostQuery(INSERIR_CUSTO_FIXO, { nome, valor });
  revalidatePath("/");
}

export async function toggleRecorrente(formData) {
  const id = formData.get("id");
  const status = formData.get("status") === "true";
  await nhostQuery(TOGGLE_RECORRENTE, { id, status: !status });
  revalidatePath("/");
}

export async function toggleCustoFixo(formData) {
  const id = formData.get("id");
  const status = formData.get("status") === "true";
  await nhostQuery(TOGGLE_CUSTO_FIXO, { id, status: !status });
  revalidatePath("/");
}

export async function adicionarMeta(formData) {
  const nome = formData.get("nome");
  const meta = parseFloat(formData.get("meta"));
  await nhostQuery(INSERIR_META, { nome, meta });
  revalidatePath("/");
}

export async function guardarNaMeta(formData) {
  const id = formData.get("id");
  const nomeMeta = formData.get("nome_meta");
  const valor = parseFloat(formData.get("valor"));
  const id_mes = formData.get("id_mes");
  const mes = formData.get("mes");

  if (valor <= 0) return;

  const { metas_by_pk } = await nhostQuery(META_BY_ID, { id });
  if (!metas_by_pk) redirect(`/?mes=${mes}&erro=meta_invalida`);

  const novoValor = Number(metas_by_pk.valor_atual) + valor;
  if (novoValor > Number(metas_by_pk.meta)) {
    redirect(`/?mes=${mes}&erro=aporte_excede`);
  }

  await nhostQuery(INSERIR_TRANSACAO_META, {
    id_mes, nome: `Aporte meta: ${nomeMeta}`, valor, tipo: "saida", origem: "meta_aporte",
  });
  await nhostQuery(GUARDAR_NA_META, { id, valor });

  revalidatePath("/");
  redirect(`/?mes=${mes}`);
}

export async function retirarDaMeta(formData) {
  const id = formData.get("id");
  const nomeMeta = formData.get("nome_meta");
  const valor = parseFloat(formData.get("valor"));
  const id_mes = formData.get("id_mes");
  const mes = formData.get("mes");

  if (valor <= 0) return;

  const { metas_by_pk } = await nhostQuery(META_BY_ID, { id });
  if (!metas_by_pk || Number(metas_by_pk.valor_atual) < valor) {
    redirect(`/?mes=${mes}&erro=retirada`);
  }

  await nhostQuery(INSERIR_TRANSACAO_META, {
    id_mes, nome: `Retirada meta: ${nomeMeta}`, valor, tipo: "entrada", origem: "meta_retirada",
  });
  await nhostQuery(GUARDAR_NA_META, { id, valor: -valor });

  revalidatePath("/");
  redirect(`/?mes=${mes}`);
}

export async function deletarMeta(formData) {
  await nhostQuery(DELETAR_META, { id: formData.get("id") });
  revalidatePath("/");
}

export async function deletarAvulso(formData) {
  await nhostQuery(DELETAR_AVULSO, { id: formData.get("id") });
  revalidatePath("/");
}

export async function adicionarRecorrenteOuCusto(formData) {
  // já existem adicionarRecorrente e adicionarCustoFixo da etapa anterior, sem mudança
}

export async function adicionarItemMeta(formData) {
  const id_meta = formData.get("id_meta");
  const nome = formData.get("nome");
  const valor_planejado = parseFloat(formData.get("valor_planejado"));
  const mes = formData.get("mes");

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

export async function guardarInvestimento(formData) {
  const nome = formData.get("nome");
  const tipo = formData.get("tipo");
  const valor = parseFloat(formData.get("valor"));
  const prazo_dias = formData.get("prazo_dias") ? parseInt(formData.get("prazo_dias")) : null;
  const id_mes = formData.get("id_mes");
  const mes = formData.get("mes");

  await nhostQuery(INSERIR_INVESTIMENTO, { nome, tipo, valor_investido: valor, prazo_dias });
  await nhostQuery(INSERIR_TRANSACAO_META, {
    id_mes, nome: `Aplicação: ${nome}`, valor, tipo: "saida", origem: "investimento_aporte",
  });

  revalidatePath("/");
  redirect(`/?mes=${mes}`);
}

export async function resgatarInvestimento(formData) {
  const id = formData.get("id");
  const nome = formData.get("nome");
  const valor_resgatado = parseFloat(formData.get("valor_resgatado"));
  const id_mes = formData.get("id_mes");
  const mes = formData.get("mes");

  await nhostQuery(RESGATAR_INVESTIMENTO, { id, valor_resgatado });
  await nhostQuery(INSERIR_TRANSACAO_META, {
    id_mes, nome: `Resgate: ${nome}`, valor: valor_resgatado, tipo: "entrada", origem: "investimento_resgate",
  });

  revalidatePath("/");
  redirect(`/?mes=${mes}`);
}

export async function editarItemMeta(formData) {
  const id = formData.get("id");
  const id_meta = formData.get("id_meta");
  const nome = formData.get("nome");
  const valor_planejado = parseFloat(formData.get("valor_planejado"));

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
  const valor_total = parseFloat(formData.get("valor_total"));
  const qtd_parcelas = parseInt(formData.get("qtd_parcelas"));
  const id_mes = formData.get("id_mes");
  const mes = formData.get("mes");

  const valor_parcela = Math.round((valor_total / qtd_parcelas) * 100) / 100;

  const { insert_parcelamentos_one } = await nhostQuery(INSERIR_PARCELAMENTO, {
    descricao: nome_item, valor_parcela, qtd_parcelas, proximo_mes: mes + "-01",
  });
  const id_parcelamento = insert_parcelamentos_one.id_parcelamento;

  await nhostQuery(VINCULAR_PARCELAMENTO_ITEM, { id_item, id_parcelamento });

  // paga a 1ª parcela já, nesse mês
  await nhostQuery(INSERIR_TRANSACAO_META, {
    id_mes, nome: `Parcela 1/${qtd_parcelas}: ${nome_item}`, valor: valor_parcela, tipo: "saida", origem: "parcelamento",
  });

  revalidatePath(`/metas/${id_meta}`);
}

export async function comprarAvulsoParcelado(formData) {
  const nome = formData.get("nome");
  const valor_total = parseFloat(formData.get("valor_total"));
  const qtd_parcelas = parseInt(formData.get("qtd_parcelas"));
  const id_mes = formData.get("id_mes");
  const mes = formData.get("mes");

  const valor_parcela = Math.round((valor_total / qtd_parcelas) * 100) / 100;

  await nhostQuery(INSERIR_PARCELAMENTO, {
    descricao: nome, valor_parcela, qtd_parcelas, proximo_mes: mes + "-01",
  });

  await nhostQuery(INSERIR_TRANSACAO_META, {
    id_mes, nome: `Parcela 1/${qtd_parcelas}: ${nome}`, valor: valor_parcela, tipo: "saida", origem: "parcelamento",
  });

  revalidatePath("/");
}