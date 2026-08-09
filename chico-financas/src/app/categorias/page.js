import Toast from "../Toast";
import { nhostQuery } from "@/lib/nhost";
import { CATEGORIAS_COM_PALAVRAS } from "@/lib/queries";
import {
  criarCategoria, deletarCategoria, adicionarPalavra, removerPalavra, recategorizarTudo,
} from "../actions";

export default async function Categorias({ searchParams }) {
  const sp = await searchParams;
  const erro = sp.erro === "valor_invalido" ? "Informe um nome válido." : null;

  const { categorias } = await nhostQuery(CATEGORIAS_COM_PALAVRAS);

  return (
    <div className="wrap">
      <h1>Categorias</h1>
      <p className="sub">Um gasto avulso, recorrente ou custo fixo é categorizado automaticamente quando o nome contém uma dessas palavras.</p>
      {erro && <Toast mensagem={erro} />}

      <section>
        <form action={recategorizarTudo}>
          <button type="submit" className="btn-link">recategorizar lançamentos existentes</button>
        </form>
      </section>

      <section>
        {categorias.length === 0 && <div className="empty">Nenhuma categoria cadastrada.</div>}
        {categorias.map((c) => (
          <div className="goal-card" key={c.id_categoria}>
            <div className="goal-nums" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{c.nome}</strong>
              <form action={deletarCategoria}>
                <input type="hidden" name="id" value={c.id_categoria} />
                <button className="goal-remove" type="submit">remover categoria</button>
              </form>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
              {c.palavras.length === 0 && <span className="empty">Nenhuma palavra-chave.</span>}
              {c.palavras.map((p) => (
                <form action={removerPalavra} key={p.palavra} style={{ display: "inline-flex" }}>
                  <input type="hidden" name="id_categoria" value={c.id_categoria} />
                  <input type="hidden" name="palavra" value={p.palavra} />
                  <button
                    type="submit"
                    className="stamp ok"
                    style={{ border: "1px solid var(--gold)", cursor: "pointer" }}
                    title="remover palavra"
                  >
                    {p.palavra} ×
                  </button>
                </form>
              ))}
            </div>
            <form action={adicionarPalavra} className="add-form">
              <input type="hidden" name="id_categoria" value={c.id_categoria} />
              <input className="name" name="palavra" placeholder="Nova palavra-chave" required />
              <button type="submit">+</button>
            </form>
          </div>
        ))}
        <form action={criarCategoria} className="add-form">
          <input className="name" name="nome" placeholder="Nome da categoria" required />
          <button type="submit">+ categoria</button>
        </form>
      </section>
    </div>
  );
}
