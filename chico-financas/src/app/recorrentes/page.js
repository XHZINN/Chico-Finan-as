import Toast from "../Toast";
import { nhostQuery } from "@/lib/nhost";
import { TODOS_RECORRENTES_CUSTOS } from "@/lib/queries";
import {
  adicionarRecorrente, adicionarCustoFixo, toggleRecorrente, toggleCustoFixo,
  editarRecorrente, editarCustoFixo,
} from "../actions";

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
          <div className="item-row" key={r.id_recorrente}>
            {editando === r.id_recorrente ? (
              <form action={editarRecorrente} className="add-form" style={{ flex: 1 }}>
                <input type="hidden" name="id" value={r.id_recorrente} />
                <input className="name" name="nome" defaultValue={r.nome} required />
                <input className="value" name="valor" type="number" step="0.01" defaultValue={r.valor} required />
                <button type="submit">salvar</button>
                <a href="/recorrentes" className="btn-link">cancelar</a>
              </form>
            ) : (
              <>
                <span className="stamp ok" style={{ opacity: r.status ? 1 : 0.35 }}>{r.status ? "ativo" : "inativo"}</span>
                <span className="name">{r.nome}</span>
                <span className="value">{fmt(r.valor)}</span>
                <a href={`/recorrentes?editar=${r.id_recorrente}`} className="btn-link">editar</a>
                <form action={toggleRecorrente}>
                  <input type="hidden" name="id" value={r.id_recorrente} />
                  <input type="hidden" name="status" value={r.status} />
                  <button className="del" type="submit">{r.status ? "desativar" : "ativar"}</button>
                </form>
              </>
            )}
          </div>
        ))}
        <form action={adicionarRecorrente} className="add-form">
          <input className="name" name="nome" placeholder="Nome" required />
          <input className="value" name="valor" placeholder="Valor" type="number" step="0.01" required />
          <button type="submit">+</button>
        </form>
      </section>

      <section>
        <h2>Custos fixos</h2>
        {custos_fixos.length === 0 && <div className="empty">Nenhum custo fixo cadastrado.</div>}
        {custos_fixos.map((c) => (
          <div className="item-row" key={c.id_custo_fx}>
            {editando === c.id_custo_fx ? (
              <form action={editarCustoFixo} className="add-form" style={{ flex: 1 }}>
                <input type="hidden" name="id" value={c.id_custo_fx} />
                <input className="name" name="nome" defaultValue={c.nome} required />
                <input className="value" name="valor" type="number" step="0.01" defaultValue={c.valor} required />
                <button type="submit">salvar</button>
                <a href="/recorrentes" className="btn-link">cancelar</a>
              </form>
            ) : (
              <>
                <span className="stamp ok" style={{ opacity: c.status ? 1 : 0.35 }}>{c.status ? "ativo" : "inativo"}</span>
                <span className="name">{c.nome}</span>
                <span className="value">{fmt(c.valor)}</span>
                <a href={`/recorrentes?editar=${c.id_custo_fx}`} className="btn-link">editar</a>
                <form action={toggleCustoFixo}>
                  <input type="hidden" name="id" value={c.id_custo_fx} />
                  <input type="hidden" name="status" value={c.status} />
                  <button className="del" type="submit">{c.status ? "desativar" : "ativar"}</button>
                </form>
              </>
            )}
          </div>
        ))}
        <form action={adicionarCustoFixo} className="add-form">
          <input className="name" name="nome" placeholder="Nome" required />
          <input className="value" name="valor" placeholder="Valor" type="number" step="0.01" required />
          <button type="submit">+</button>
        </form>
      </section>
    </div>
  );
}
