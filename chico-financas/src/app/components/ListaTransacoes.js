import { deletarAvulso, atualizarCategoriaTransacao } from "../actions";

const LIMITE = 8;

function fmt(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function agruparPorNome(items) {
  const grupos = [];
  const indexPorChave = new Map();
  for (const item of items) {
    const chave = item.nome.trim().toLowerCase();
    if (indexPorChave.has(chave)) {
      grupos[indexPorChave.get(chave)].itens.push(item);
    } else {
      indexPorChave.set(chave, grupos.length);
      grupos.push({ nome: item.nome, itens: [item] });
    }
  }
  return grupos.map(g => ({
    ...g,
    total: g.itens.reduce((s, i) => s + Number(i.valor), 0),
  }));
}

function Stamp({ origem, stamps }) {
  const cfg = stamps?.[origem];
  if (!cfg) return null;
  return cfg.teal
    ? <span className="stamp ok" style={{ background: "var(--teal-bg)", color: "var(--teal)", borderColor: "var(--teal)" }}>{cfg.texto}</span>
    : <span className="stamp ok">{cfg.texto}</span>;
}

function SeletorCategoria({ item, categorias }) {
  return (
    <form action={atualizarCategoriaTransacao} style={{ display: "flex", gap: 4, alignItems: "center", padding: "0 0 8px 0" }}>
      <input type="hidden" name="id" value={item.id_transacao} />
      <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>categoria:</span>
      <select
        name="id_categoria"
        defaultValue={item.id_categoria || ""}
        style={{ fontSize: 12, padding: "2px 4px", border: "1px solid var(--line)", borderRadius: 4, background: "var(--paper-2)", color: "var(--ink)" }}
      >
        <option value="">Sem categoria</option>
        {categorias.map(c => (
          <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>
        ))}
      </select>
      <button type="submit" className="btn-link" style={{ padding: "2px 8px", fontSize: 11, marginBottom: 0 }}>salvar</button>
    </form>
  );
}

function LinhaItem({ item, stamps, deletavelOrigens, mesFechado, categorias }) {
  const categorizavel = categorias && deletavelOrigens.includes(item.origem);
  return (
    <div>
      <div className="item-row">
        <Stamp origem={item.origem} stamps={stamps} />
        <span className="name">{item.nome}</span>
        <span className="value">{fmt(item.valor)}</span>
        {deletavelOrigens.includes(item.origem) && !mesFechado && (
          <form action={deletarAvulso}>
            <input type="hidden" name="id" value={item.id_transacao} />
            <button className="del" type="submit">×</button>
          </form>
        )}
      </div>
      {categorizavel && <SeletorCategoria item={item} categorias={categorias} />}
    </div>
  );
}

function LinhaGrupo({ grupo, stamps, deletavelOrigens, mesFechado, categorias }) {
  if (grupo.itens.length === 1) {
    return <LinhaItem item={grupo.itens[0]} stamps={stamps} deletavelOrigens={deletavelOrigens} mesFechado={mesFechado} categorias={categorias} />;
  }
  return (
    <details>
      <summary className="item-row group-summary">
        <Stamp origem={grupo.itens[0].origem} stamps={stamps} />
        <span className="name">{grupo.nome} <small style={{ color: "var(--ink-soft)" }}>×{grupo.itens.length}</small></span>
        <span className="value">{fmt(grupo.total)}</span>
      </summary>
      <div className="group-items">
        {grupo.itens.map(item => (
          <LinhaItem key={item.id_transacao} item={item} stamps={stamps} deletavelOrigens={deletavelOrigens} mesFechado={mesFechado} categorias={categorias} />
        ))}
      </div>
    </details>
  );
}

export default function ListaTransacoes({ items, stamps, deletavelOrigens, mesFechado, vazioTexto, categorias }) {
  if (items.length === 0) {
    return <div className="empty">{vazioTexto}</div>;
  }

  const grupos = agruparPorNome(items);
  const visiveis = grupos.slice(0, LIMITE);
  const restantes = grupos.slice(LIMITE);

  return (
    <>
      {visiveis.map((grupo) => (
        <LinhaGrupo key={grupo.itens[0].id_transacao} grupo={grupo} stamps={stamps} deletavelOrigens={deletavelOrigens} mesFechado={mesFechado} categorias={categorias} />
      ))}
      {restantes.length > 0 && (
        <details>
          <summary className="ver-mais">ver mais ({restantes.length})</summary>
          {restantes.map((grupo) => (
            <LinhaGrupo key={grupo.itens[0].id_transacao} grupo={grupo} stamps={stamps} deletavelOrigens={deletavelOrigens} mesFechado={mesFechado} categorias={categorias} />
          ))}
        </details>
      )}
    </>
  );
}
