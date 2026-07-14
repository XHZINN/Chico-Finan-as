import { nhostQuery } from "@/lib/nhost";
import { META_COM_ITENS, MES_INFO } from "@/lib/queries";
import { adicionarItemMeta, toggleItemComprado, editarItemMeta, comprarItemParcelado } from "../../actions";

function fmt(n) { return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }

export default async function MetaDetalhe({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const mesYYYYMM = new Date().toISOString().slice(0, 7);
  const { meses } = await nhostQuery(MES_INFO, { mes: mesYYYYMM + "-01" });
  const mesInfo = meses[0];

  const { metas_by_pk: meta, meta_itens } = await nhostQuery(META_COM_ITENS, { id });

  const somaPlanejada = meta_itens.reduce((s, i) => s + Number(i.valor_planejado), 0);
  const disponivel = Number(meta.meta) - somaPlanejada;

  const itensComprados = meta_itens.filter(i => i.comprado);
  const totalGasto = itensComprados.reduce((s, i) => s + Number(i.valor_planejado), 0);

  const parcelasAtivas = meta_itens.filter(i => i.parcelamento && i.parcelamento.ativo);
  const qtdParcelasAtivas = parcelasAtivas.length;

  // itens já planejados mas ainda não comprados nem parcelados: dinheiro reservado, ainda não gasto
  const itensReservados = meta_itens.filter(i => !i.comprado && !i.id_parcelamento);
  const valorReservado = itensReservados.reduce((s, i) => s + Number(i.valor_planejado), 0);
  const saldoReal = Number(meta.valor_atual) - valorReservado;

  return (
    <div className="wrap">
      <h1>{meta.nome}</h1>
      <a href="/" className="btn-link">&larr; voltar</a>
      <div className="receipt">
        <div className="receipt-row"><span className="label">Guardado</span><span>{fmt(meta.valor_atual)}</span></div>
        <div className="receipt-row"><span className="label">Gasto</span><span>{fmt(totalGasto)}</span></div>
        <div className="receipt-row"><span className="label">Alvo</span><span>{fmt(meta.meta)}</span></div>
        <div className="receipt-row"><span className="label">Parcelas ativas</span><span>{qtdParcelasAtivas}</span></div>
       <div className="receipt-highlights">
          <div className="receipt-highlight">
            <span className="label">Ainda livre pra planejar</span>
            <span className="value">{fmt(disponivel)}</span>
          </div>
          <div className="receipt-highlight teal">
            <span className="label">Saldo real disponível</span>
            <span className="value">{fmt(saldoReal)}</span>
          </div>
        </div>
      </div>

      <section>
        <h2>Itens</h2>
        {meta_itens.map((item) => (
          <div className="item-row" key={item.id_item}>
            {sp.editar === item.id_item ? (
              <form action={editarItemMeta} className="add-form" style={{flex: 1}}>
                <input type="hidden" name="id" value={item.id_item} />
                <input type="hidden" name="id_meta" value={meta.id_meta} />
                <input className="name" name="nome" defaultValue={item.nome} required />
                <input className="value" name="valor_planejado" type="number" step="0.01" defaultValue={item.valor_planejado} required />
                <button type="submit">salvar</button>
                <a href={`/metas/${meta.id_meta}`} className="btn-link">cancelar</a>
              </form>
            ) : (
              <>
                <span className="name" style={{textDecoration: item.comprado ? "line-through" : "none"}}>{item.nome}</span>
                <span className="value">{fmt(item.valor_planejado)}</span>

                {!item.comprado && !item.id_parcelamento && (
                  <a href={`/metas/${meta.id_meta}?editar=${item.id_item}`} className="btn-link">editar</a>
                )}

                {!item.id_parcelamento && (
                  <form action={toggleItemComprado}>
                    <input type="hidden" name="id_item" value={item.id_item} />
                    <input type="hidden" name="id_meta" value={meta.id_meta} />
                    <input type="hidden" name="nome_item" value={item.nome} />
                    <input type="hidden" name="valor" value={item.valor_planejado} />
                    <input type="hidden" name="comprado" value={item.comprado} />
                    <input type="hidden" name="id_mes" value={mesInfo?.id_mes} />
                    <input type="hidden" name="mes" value={mesYYYYMM} />
                    <button type="submit">{item.comprado ? "desmarcar" : "comprado"}</button>
                  </form>
                )}

                {!item.comprado && !item.id_parcelamento && (
                  <form action={comprarItemParcelado} className="add-form" style={{marginTop: 6}}>
                    <input type="hidden" name="id_item" value={item.id_item} />
                    <input type="hidden" name="id_meta" value={meta.id_meta} />
                    <input type="hidden" name="nome_item" value={item.nome} />
                    <input type="hidden" name="valor_total" value={item.valor_planejado} />
                    <input type="hidden" name="id_mes" value={mesInfo?.id_mes} />
                    <input type="hidden" name="mes" value={mesYYYYMM} />
                    <input name="qtd_parcelas" type="number" placeholder="parcelas" style={{width: 70}} required />
                    <button type="submit">parcelar</button>
                  </form>
                )}

                {item.id_parcelamento && (
                  <div style={{display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end"}}>
                    <span className="stamp ok" style={{background: "var(--teal-bg)", color: "var(--teal)", borderColor: "var(--teal)"}}>
                      {item.parcelamento?.ativo
                        ? `parcelado ${item.parcelamento.parcelas_pagas}/${item.parcelamento.qtd_parcelas}`
                        : "quitado"}
                    </span>
                    {item.parcelamento?.ativo && (
                      <span style={{fontSize: 12, color: "var(--ink-soft)"}}>
                        {fmt(item.parcelamento.valor_parcela)}/mês · próxima: {item.parcelamento.proximo_mes?.slice(0, 7)}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <form action={adicionarItemMeta} className="add-form">
          <input type="hidden" name="id_meta" value={meta.id_meta} />
          <input type="hidden" name="mes" value={mesYYYYMM} />
          <input className="name" name="nome" placeholder="Nome da peça" required />
          <input className="value" name="valor_planejado" placeholder="Valor" type="number" step="0.01" required />
          <button type="submit">+</button>
        </form>
      </section>
    </div>
  );
}