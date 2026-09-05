"use client";

import { useActionState } from "react";
import { analisarExtratoMercadoPago, confirmarImportacaoExtrato } from "../actions";
import SubmitButton from "../components/SubmitButton";

function fmt(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

const ESTADO_INICIAL = { linhas: null, erro: null };

export default function ImportadorExtrato() {
  const [state, formAction, isPending] = useActionState(analisarExtratoMercadoPago, ESTADO_INICIAL);

  return (
    <>
      <section>
        <h2>1. Escolher o extrato</h2>
        <p className="sub">Baixe o PDF do extrato de conta no app/site do Mercado Pago e envie aqui.</p>
        <form action={formAction} className="add-form" style={{ alignItems: "center" }}>
          <input type="file" name="arquivo" accept="application/pdf" required />
          <label className="conf">de <input type="date" name="de" /></label>
          <label className="conf">até <input type="date" name="ate" /></label>
          <button type="submit" disabled={isPending}>{isPending ? "lendo…" : "ler PDF"}</button>
        </form>
        {state.erro && <div className="empty" style={{ color: "var(--rust)", fontStyle: "normal" }}>{state.erro}</div>}
      </section>

      {state.linhas && (
        <section>
          <h2>2. Conferir e importar</h2>
          <p className="sub">
            {state.linhas.length} lançamento{state.linhas.length === 1 ? "" : "s"} encontrado{state.linhas.length === 1 ? "" : "s"}.
            Desmarque o que não quiser importar.
          </p>
          <form action={confirmarImportacaoExtrato}>
            <input type="hidden" name="total_linhas" value={state.linhas.length} />
            {state.linhas.map((l, i) => {
              const bloqueado = l.duplicado || !l.mes_existe || l.mes_fechado;
              return (
                <div className="item-row" key={i}>
                  <input
                    type="checkbox"
                    name={`linha_${i}_incluir`}
                    defaultChecked={!bloqueado}
                    disabled={bloqueado}
                  />
                  <input type="hidden" name={`linha_${i}_data`} value={l.data} />
                  <input type="hidden" name={`linha_${i}_descricao`} value={l.descricao} />
                  <input type="hidden" name={`linha_${i}_valor`} value={l.valor} />
                  <input type="hidden" name={`linha_${i}_tipo`} value={l.tipo} />
                  <input type="hidden" name={`linha_${i}_id_operacao`} value={l.id_operacao} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--ink-soft)", minWidth: 70 }}>
                    {l.data.slice(8, 10)}/{l.data.slice(5, 7)}
                  </span>
                  <span className="name">{l.descricao}</span>
                  {l.mes_existe && !l.mes_fechado && (
                    <select name={`linha_${i}_categoria`} defaultValue={l.id_categoria_sugerida} disabled={bloqueado}>
                      <option value="">Sem categoria</option>
                      {l.categorias.map(c => (
                        <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
                      ))}
                    </select>
                  )}
                  {l.duplicado && <span className="stamp ok">já importado</span>}
                  {!l.mes_existe && <span className="stamp ok" style={{ color: "var(--rust)", borderColor: "var(--rust)" }}>mês inexistente</span>}
                  {l.mes_existe && l.mes_fechado && <span className="stamp ok" style={{ color: "var(--rust)", borderColor: "var(--rust)" }}>mês fechado</span>}
                  <span className="value" style={{ color: l.tipo === "entrada" ? "var(--teal)" : "var(--ink)" }}>
                    {l.tipo === "entrada" ? "+" : "-"}{fmt(l.valor)}
                  </span>
                </div>
              );
            })}
            <div style={{ marginTop: 14 }}>
              <SubmitButton className="btn-link primary">confirmar importação</SubmitButton>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
