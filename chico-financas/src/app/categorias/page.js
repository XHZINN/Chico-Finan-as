import Toast from "../Toast";
import { nhostQuery } from "@/lib/nhost";
import { CATEGORIAS_COM_PALAVRAS } from "@/lib/queries";
import {
  criarCategoria, deletarCategoria, adicionarPalavra, removerPalavra, recategorizarTudo,
} from "../actions";
import SubmitButton from "../components/SubmitButton";

function ListaCategorias({ categorias }) {
  return (
    <>
      {categorias.length === 0 && <div className="empty">Nenhuma categoria cadastrada.</div>}
      {categorias.map((c) => (
        <div className="goal-card" key={c.id_categoria}>
          <div className="goal-nums" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>{c.nome}</strong>
            <form action={deletarCategoria}>
              <input type="hidden" name="id" value={c.id_categoria} />
              <SubmitButton className="goal-remove">remover categoria</SubmitButton>
            </form>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
            {c.palavras.length === 0 && <span className="empty">Nenhuma palavra-chave.</span>}
            {c.palavras.map((p) => (
              <form action={removerPalavra} key={p.palavra} style={{ display: "inline-flex" }}>
                <input type="hidden" name="id_categoria" value={c.id_categoria} />
                <input type="hidden" name="palavra" value={p.palavra} />
                <SubmitButton
                  className="stamp ok"
                  style={{ border: "1px solid var(--gold)", cursor: "pointer" }}
                  title="remover palavra"
                >
                  {p.palavra} ×
                </SubmitButton>
              </form>
            ))}
          </div>
          <form action={adicionarPalavra} className="add-form">
            <input type="hidden" name="id_categoria" value={c.id_categoria} />
            <input className="name" name="palavra" placeholder="Nova palavra-chave" required />
            <SubmitButton>+</SubmitButton>
          </form>
        </div>
      ))}
    </>
  );
}

export default async function Categorias({ searchParams }) {
  const sp = await searchParams;
  const erro = sp.erro === "valor_invalido" ? "Informe um nome válido." : null;

  const { categorias } = await nhostQuery(CATEGORIAS_COM_PALAVRAS);
  const categoriasEntrada = categorias.filter(c => c.tipo === "entrada");
  const categoriasSaida = categorias.filter(c => c.tipo === "saida");

  return (
    <div className="wrap">
      <h1>Categorias</h1>
      <p className="sub">Um lançamento avulso, recorrente ou custo fixo é categorizado automaticamente quando o nome contém uma dessas palavras — entradas só comparam com categorias de entrada, e saídas só com categorias de saída.</p>
      {erro && <Toast mensagem={erro} />}

      <section>
        <form action={recategorizarTudo}>
          <SubmitButton className="btn-link">categorizar lançamentos sem categoria</SubmitButton>
        </form>
      </section>

      <section>
        <h2>Categorias de saída</h2>
        <ListaCategorias categorias={categoriasSaida} />
        <form action={criarCategoria} className="add-form">
          <input type="hidden" name="tipo" value="saida" />
          <input className="name" name="nome" placeholder="Nome da categoria" required />
          <SubmitButton>+ categoria de saída</SubmitButton>
        </form>
      </section>

      <section>
        <h2>Categorias de entrada</h2>
        <ListaCategorias categorias={categoriasEntrada} />
        <form action={criarCategoria} className="add-form">
          <input type="hidden" name="tipo" value="entrada" />
          <input className="name" name="nome" placeholder="Nome da categoria" required />
          <SubmitButton>+ categoria de entrada</SubmitButton>
        </form>
      </section>
    </div>
  );
}
