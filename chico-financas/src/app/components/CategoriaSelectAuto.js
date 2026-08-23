"use client";

import { atualizarCategoriaTransacao } from "../actions";

export default function CategoriaSelectAuto({ id_transacao, id_categoria, categorias, tipo }) {
  return (
    <form action={atualizarCategoriaTransacao}>
      <input type="hidden" name="id" value={id_transacao} />
      <select
        name="id_categoria"
        defaultValue={id_categoria || ""}
        onChange={(e) => e.currentTarget.form.requestSubmit()}
        style={{
          fontSize: 11,
          padding: "2px 4px",
          border: "1px solid var(--line)",
          borderRadius: 4,
          background: "var(--paper-2)",
          color: "var(--ink-soft)",
          maxWidth: 120,
        }}
      >
        <option value="">Sem categoria</option>
        {categorias.filter(c => c.tipo === tipo).map(c => (
          <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
        ))}
      </select>
    </form>
  );
}
