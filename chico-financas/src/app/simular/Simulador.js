"use client";

import { useState } from "react";

function fmt(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

const selectStyle = {
  fontFamily: "'IBM Plex Sans',sans-serif",
  border: "1px solid var(--line)",
  background: "var(--paper-2)",
  borderRadius: 4,
  padding: "8px 10px",
  fontSize: 14,
  color: "var(--ink)",
};

let proximoId = 1;

export default function Simulador({ saldoAtual, categorias, saidasPorCategoria }) {
  const [itens, setItens] = useState([]);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("saida");
  const [idCategoria, setIdCategoria] = useState("");

  const categoriasDoTipo = categorias.filter(c => c.tipo === tipo);

  function adicionar(e) {
    e.preventDefault();
    const v = parseFloat(valor);
    if (!nome.trim() || !(v > 0)) return;
    const categoria = categoriasDoTipo.find(c => c.id_categoria === idCategoria);
    setItens(prev => [...prev, {
      id: proximoId++,
      nome: nome.trim(),
      valor: Math.round(v * 100) / 100,
      tipo,
      categoriaNome: categoria ? categoria.nome : null,
    }]);
    setNome("");
    setValor("");
    setIdCategoria("");
  }

  function remover(id) {
    setItens(prev => prev.filter(i => i.id !== id));
  }

  const totalSimEntradas = itens.filter(i => i.tipo === "entrada").reduce((s, i) => s + i.valor, 0);
  const totalSimSaidas = itens.filter(i => i.tipo === "saida").reduce((s, i) => s + i.valor, 0);
  const saldoProjetado = saldoAtual + totalSimEntradas - totalSimSaidas;

  const categoriasAfetadas = [...new Set(
    itens.filter(i => i.tipo === "saida").map(i => i.categoriaNome || "Sem categoria")
  )];

  return (
    <>
      <div className="receipt">
        <div className="receipt-row"><span className="label">Saldo atual</span><span>{fmt(saldoAtual)}</span></div>
        {totalSimEntradas > 0 && <div className="receipt-row"><span className="label">+ Ganhos simulados</span><span>{fmt(totalSimEntradas)}</span></div>}
        {totalSimSaidas > 0 && <div className="receipt-row"><span className="label">- Gastos simulados</span><span>{fmt(totalSimSaidas)}</span></div>}
        <div className="receipt-row total"><span className="label">Saldo projetado</span><span>{fmt(saldoProjetado)}</span></div>
      </div>

      <section>
        <h2>Adicionar hipótese</h2>
        <form onSubmit={adicionar} className="add-form">
          <select style={selectStyle} value={tipo} onChange={(e) => { setTipo(e.target.value); setIdCategoria(""); }}>
            <option value="saida">Gasto</option>
            <option value="entrada">Ganho</option>
          </select>
          <input className="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Descrição" required />
          <input className="value" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor" type="number" step="0.01" required />
          <select style={selectStyle} value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)}>
            <option value="">Sem categoria</option>
            {categoriasDoTipo.map(c => (
              <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
            ))}
          </select>
          <button type="submit">+</button>
        </form>
      </section>

      <section>
        <h2>Hipóteses ({itens.length})</h2>
        {itens.length === 0 && <div className="empty">Nenhuma hipótese adicionada ainda.</div>}
        {itens.map((i) => (
          <div className="item-row" key={i.id}>
            <span className="stamp ok" style={{ opacity: 0.6 }}>{i.tipo === "entrada" ? "ganho" : "gasto"}</span>
            <span className="name">
              {i.nome}
              {i.categoriaNome && <small style={{ color: "var(--ink-soft)" }}> · {i.categoriaNome}</small>}
            </span>
            <span className="value" style={{ color: i.tipo === "entrada" ? "var(--teal)" : "var(--ink)" }}>
              {i.tipo === "entrada" ? "+" : "-"}{fmt(i.valor)}
            </span>
            <button type="button" className="del" onClick={() => remover(i.id)} title="remover">×</button>
          </div>
        ))}
        {itens.length > 0 && (
          <button type="button" className="btn-link" style={{ marginTop: 12 }} onClick={() => setItens([])}>
            limpar tudo
          </button>
        )}
      </section>

      {categoriasAfetadas.length > 0 && (
        <section>
          <h2>Impacto por categoria</h2>
          <p className="sub" style={{ margin: "0 0 8px" }}>Gasto real do mês nessa categoria + o que você simulou.</p>
          {categoriasAfetadas.map((nomeCategoria) => {
            const real = saidasPorCategoria[nomeCategoria] || 0;
            const simulado = itens
              .filter(i => i.tipo === "saida" && (i.categoriaNome || "Sem categoria") === nomeCategoria)
              .reduce((s, i) => s + i.valor, 0);
            return (
              <div className="item-row" key={nomeCategoria}>
                <span className="name">{nomeCategoria}</span>
                <span className="value">{fmt(real)} + {fmt(simulado)} = {fmt(real + simulado)}</span>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
