"use client";

import { useFormStatus } from "react-dom";
import { atualizarCategoriaTransacao } from "../actions";

function Select({ id_categoria, categorias, tipo }) {
  const { pending } = useFormStatus();
  return (
    <select
      name="id_categoria"
      defaultValue={id_categoria || ""}
      disabled={pending}
      aria-busy={pending}
      onChange={(e) => e.currentTarget.form.requestSubmit()}
      style={{
        fontSize: 11,
        padding: "2px 4px",
        border: "1px solid var(--line)",
        borderRadius: 4,
        background: "var(--paper-2)",
        color: "var(--ink-soft)",
        maxWidth: 120,
        opacity: pending ? 0.6 : 1,
        cursor: pending ? "wait" : "pointer",
      }}
    >
      <option value="">Sem categoria</option>
      {categorias.filter(c => c.tipo === tipo).map(c => (
        <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
      ))}
    </select>
  );
}

export default function CategoriaSelectAuto({ id_transacao, id_categoria, categorias, tipo }) {
  return (
    <form action={atualizarCategoriaTransacao}>
      <input type="hidden" name="id" value={id_transacao} />
      <Select id_categoria={id_categoria} categorias={categorias} tipo={tipo} />
    </form>
  );
}
