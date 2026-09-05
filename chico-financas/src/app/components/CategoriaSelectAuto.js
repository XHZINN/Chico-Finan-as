"use client";

import { useState, useTransition } from "react";
import { atualizarCategoriaTransacao } from "../actions";

export default function CategoriaSelectAuto({ id_transacao, id_categoria, categorias, tipo }) {
  const [valor, setValor] = useState(id_categoria || "");
  const [pending, startTransition] = useTransition();

  function onChange(e) {
    const novoValor = e.target.value;
    setValor(novoValor);
    const formData = new FormData();
    formData.set("id", id_transacao);
    formData.set("id_categoria", novoValor);
    startTransition(() => {
      atualizarCategoriaTransacao(formData);
    });
  }

  return (
    <select
      value={valor}
      onChange={onChange}
      disabled={pending}
      aria-busy={pending}
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
