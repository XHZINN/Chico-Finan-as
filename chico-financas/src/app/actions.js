"use server";

import { redirect } from "next/navigation";
import { nhostQuery } from "@/lib/nhost";
import {
  INSERIR_AVULSO, INSERIR_RECORRENTE, INSERIR_CUSTO_FIXO,
  TOGGLE_RECORRENTE, TOGGLE_CUSTO_FIXO, META_BY_ID, 
  INSERIR_TRANSACAO_META, INSERIR_META, GUARDAR_NA_META, 
  DELETAR_META, DELETAR_AVULSO,
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