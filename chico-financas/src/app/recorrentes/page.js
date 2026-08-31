import Toast from "../Toast";
import { nhostQuery } from "@/lib/nhost";
import { TODOS_RECORRENTES_CUSTOS } from "@/lib/queries";
import {
  adicionarRecorrente, adicionarCustoFixo, toggleRecorrente, toggleCustoFixo,
  editarRecorrente, editarCustoFixo,
} from "../actions";
import SubmitButton from "../components/SubmitButton";

function fmt(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export default async function Recorrentes({ searchParams }) {
  const sp = await searchParams;
  const erro = sp.erro === "valor_invalido" ? "Informe um valor válido, maior que zero." : null;
  const editando = sp.editar || null;

  const { recorrentes, custos_fixos } = await nhostQuery(TODOS_RECORRENTES_CUSTOS);

  return (
    <div className="wrap">
      <h1>Recorrentes & Custos Fixos</h1>
      <p className="sub">Gestão geral — entradas e saídas fixas que não mudam por mês.</p>
      {erro && <Toast mensagem={erro} />}

      <section>
        <h2>Recorrentes <small>(entradas fixas)</small></h2>
        {recorrentes.length === 0 && <div className="empty">Nenhum recorrente cadastrado.</div>}
        {recorrentes.map((r) => (
          editando === r.id_recorrente ? (
            <div className="edit-card" key={r.id_recorrente}>
              <form action={editarRecorrente} className="edit-grid">
                <input type="hidden" name="id" value={r.id_recorrente} />
                <label className="field field-wide">
                  <span>Nome</span>
                  <input name="nome" defaultValue={r.nome} required />
                </label>
                <label className="field">
                  <span>Valor</span>
                  <input name="valor" type="number" step="0.01" defaultValue={r.valor} required />
                </label>
                <div className="edit-actions">
                  <a href="/recorrentes" className="btn-link">cancelar</a>
                  <SubmitButton className="btn-link primary">salvar</SubmitButton>
                </div>
              </form>
            </div>
          ) : (
            <div className="list-row" key={r.id_recorrente}>
              <span className="stamp ok" style={{ opacity: r.status ? 1 : 0.35 }}>{r.status ? "ativo" : "inativo"}</span>
              <span className="name">{r.nome}</span>
              <span className="value">{fmt(r.valor)}</span>
              <div className="row-actions">
                <a href={`/recorrentes?editar=${r.id_recorrente}`} className="btn-link">editar</a>
                <form action={toggleRecorrente}>
                  <input type="hidden" name="id" value={r.id_recorrente} />
                  <input type="hidden" name="status" value={r.status} />
                  <SubmitButton className="del">{r.status ? "desativar" : "ativar"}</SubmitButton>
                </form>
              </div>
            </div>
          )
        ))}
        <form action={adicionarRecorrente} className="add-form">
          <input className="name" name="nome" placeholder="Nome" required />
          <input className="value" name="valor" placeholder="Valor" type="number" step="0.01" required />
          <SubmitButton>+</SubmitButton>
        </form>
      </section>

      <section>
        <h2>Custos fixos</h2>
        {custos_fixos.length === 0 && <div className="empty">Nenhum custo fixo cadastrado.</div>}
        {custos_fixos.map((c) => (
          editando === c.id_custo_fx ? (
            <div className="edit-card" key={c.id_custo_fx}>
              <form action={editarCustoFixo} className="edit-grid">
                <input type="hidden" name="id" value={c.id_custo_fx} />
                <label className="field field-wide">
                  <span>Nome</span>
                  <input name="nome" defaultValue={c.nome} required />
                </label>
                <label className="field">
                  <span>Valor</span>
                  <input name="valor" type="number" step="0.01" defaultValue={c.valor} required />
                </label>
                <div className="edit-actions">
                  <a href="/recorrentes" className="btn-link">cancelar</a>
                  <SubmitButton className="btn-link primary">salvar</SubmitButton>
                </div>
              </form>
            </div>
          ) : (
            <div className="list-row" key={c.id_custo_fx}>
              <span className="stamp ok" style={{ opacity: c.status ? 1 : 0.35 }}>{c.status ? "ativo" : "inativo"}</span>
              <span className="name">{c.nome}</span>
              <span className="value">{fmt(c.valor)}</span>
              <div className="row-actions">
                <a href={`/recorrentes?editar=${c.id_custo_fx}`} className="btn-link">editar</a>
                <form action={toggleCustoFixo}>
                  <input type="hidden" name="id" value={c.id_custo_fx} />
                  <input type="hidden" name="status" value={c.status} />
                  <SubmitButton className="del">{c.status ? "desativar" : "ativar"}</SubmitButton>
                </form>
              </div>
            </div>
          )
        ))}
        <form action={adicionarCustoFixo} className="add-form">
          <input className="name" name="nome" placeholder="Nome" required />
          <input className="value" name="valor" placeholder="Valor" type="number" step="0.01" required />
          <SubmitButton>+</SubmitButton>
        </form>
      </section>
    </div>
  );
}
