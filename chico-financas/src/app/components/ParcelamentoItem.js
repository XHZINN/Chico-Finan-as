"use client";

import { useState } from "react";
import { editarParcelamento, excluirParcelamento } from "../actions";
import SubmitButton from "./SubmitButton";

function fmt(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export default function ParcelamentoItem({ p, mesYYYYMM }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <div className="edit-card">
        <form action={editarParcelamento} className="edit-grid" onSubmit={() => setEditando(false)}>
          <input type="hidden" name="id" value={p.id_parcelamento} />
          <input type="hidden" name="parcelas_pagas" value={p.parcelas_pagas} />
          <input type="hidden" name="mes" value={mesYYYYMM} />
          <label className="field field-wide">
            <span>Descrição</span>
            <input name="descricao" defaultValue={p.descricao} required />
          </label>
          <label className="field">
            <span>Valor da parcela</span>
            <input name="valor_parcela" type="number" step="0.01" defaultValue={p.valor_parcela} required />
          </label>
          <label className="field">
            <span>Parcelas</span>
            <input name="qtd_parcelas" type="number" defaultValue={p.qtd_parcelas} min={p.parcelas_pagas + 1} required />
          </label>
          <div className="edit-actions">
            <button type="button" className="btn-link" onClick={() => setEditando(false)}>cancelar</button>
            <SubmitButton className="btn-link primary">salvar</SubmitButton>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="parcel-row">
      <span className="name">{p.descricao}</span>
      <span className="meta">{p.parcelas_pagas}/{p.qtd_parcelas} · próxima {p.proximo_mes?.slice(0, 7)}</span>
      <span className="value">{fmt(p.valor_parcela)}</span>
      <div className="row-actions">
        <button type="button" className="btn-link" onClick={() => setEditando(true)}>editar</button>
        <form action={excluirParcelamento}>
          <input type="hidden" name="id" value={p.id_parcelamento} />
          <SubmitButton className="del" title="excluir parcelamento">×</SubmitButton>
        </form>
      </div>
    </div>
  );
}
