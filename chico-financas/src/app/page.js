import Toast from "./Toast";
import ListaTransacoes from "./components/ListaTransacoes";
import SubmitButton from "./components/SubmitButton";
import { nhostQuery } from "@/lib/nhost";
import {
  MES_INFO, TRANSACOES_DO_MES, ATIVOS, EXTRATO_RANGE, SALDO_ANTES_DE, CATEGORIAS_COM_PALAVRAS,
  PARCELAMENTOS_ATIVOS,
} from "@/lib/queries";
import {
  adicionarAvulso, confirmarRecorrente, confirmarCustoFixo, comprarAvulsoParcelado,
  editarParcelamento, excluirParcelamento,
} from "./actions";

function fmt(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
function mesAdjacente(mesYYYYMM, delta) {
  const d = new Date(mesYYYYMM + "-01T00:00:00");
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 7);
}
function primeiroDia(mesYYYYMM) {
  return mesYYYYMM + "-01";
}

// meta_compra (marcar/desmarcar item de meta como comprado) é só um lançamento
// contábil dentro da meta — o dinheiro já saiu do caixa no aporte, então não
// deve contar de novo no saldo de caixa nem em nenhum total "real".
const ORIGENS_NAO_CAIXA = ["meta_compra"];
// meta_aporte/retirada e investimento_aporte/resgate são transferências entre
// caixa e uma reserva sua (meta ou investimento) — contam no saldo de caixa,
// mas não são "gasto"/"renda" de verdade, então ficam fora dos totais reais.
const ORIGENS_NAO_REAIS = ["meta_aporte", "meta_retirada", "meta_compra", "investimento_aporte", "investimento_resgate"];

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const mesYYYYMM = sp.mes || new Date().toISOString().slice(0, 7);
  const erro =
  sp.erro === "valor_invalido" ? "Informe um valor válido, maior que zero." :
  null;
  const editandoParcelamento = sp.editarParcelamento || null;
  const mesData = primeiroDia(mesYYYYMM);

  // dados do mês navegado
  const { meses: mesRows } = await nhostQuery(MES_INFO, { mes: mesData });
  const mesInfo = mesRows[0];

  const { categorias } = await nhostQuery(CATEGORIAS_COM_PALAVRAS);
  const { parcelamentos } = await nhostQuery(PARCELAMENTOS_ATIVOS);

  let entradas = [];
  let saidas = [];
  let recorrentesPendentes = [];
  let custosPendentes = [];

  if (mesInfo) {
    const { transacoes_mes } = await nhostQuery(TRANSACOES_DO_MES, { id_mes: mesInfo.id_mes });
    entradas = transacoes_mes.filter(t => t.tipo === "entrada");
    saidas = transacoes_mes.filter(t => t.tipo === "saida");

    if (!mesInfo.fechado) {
      // mês aberto: recorrentes/custos ativos que ainda não foram confirmados neste mês
      const { recorrentes, custos_fixos } = await nhostQuery(ATIVOS);
      const nomesConfirmadosEntrada = new Set(entradas.filter(e => e.origem === "recorrente").map(e => e.nome));
      const nomesConfirmadosSaida = new Set(saidas.filter(s => s.origem === "custo_fixo").map(s => s.nome));
      recorrentesPendentes = recorrentes.filter(r => !nomesConfirmadosEntrada.has(r.nome));
      custosPendentes = custos_fixos.filter(c => !nomesConfirmadosSaida.has(c.nome));
    }
  }

  const entradasReais = entradas.filter(e => !ORIGENS_NAO_REAIS.includes(e.origem));
  const saidasReais = saidas.filter(s => !ORIGENS_NAO_REAIS.includes(s.origem));

  const totalEntradasReais = entradasReais.reduce((s, e) => s + Number(e.valor), 0);
  const totalSaidasReais = saidasReais.reduce((s, e) => s + Number(e.valor), 0);

  const totalAportado = saidas.filter(s => s.origem === "meta_aporte").reduce((s, e) => s + Number(e.valor), 0);
  const totalRetirado = entradas.filter(e => e.origem === "meta_retirada").reduce((s, e) => s + Number(e.valor), 0);
  const totalAplicado = saidas.filter(s => s.origem === "investimento_aporte").reduce((s, e) => s + Number(e.valor), 0);
  const totalResgatado = entradas.filter(e => e.origem === "investimento_resgate").reduce((s, e) => s + Number(e.valor), 0);

  // saldo do mês (isolado, só o que já foi confirmado/registrado de verdade;
  // exclui meta_compra pra não descontar do caixa uma 2ª vez — o dinheiro já
  // saiu do caixa no aporte, marcar como comprado só move dentro da meta)
  const totalEntradas = entradas.filter(e => !ORIGENS_NAO_CAIXA.includes(e.origem)).reduce((s, e) => s + Number(e.valor), 0);
  const totalSaidas = saidas.filter(s => !ORIGENS_NAO_CAIXA.includes(s.origem)).reduce((s, e) => s + Number(e.valor), 0);
  const saldoDoMes = totalEntradas - totalSaidas;

  // saldo acumulado: soma o saldo de todos os meses anteriores (já fechados) + o saldo deste mês
  let saldoAnterior = 0;
  if (mesInfo) {
    const { meses: mesesAnteriores } = await nhostQuery(SALDO_ANTES_DE, { antes: mesData });
    saldoAnterior = mesesAnteriores.reduce((acc, m) => {
      const ent = m.transacoes_mes.filter(t => t.tipo === "entrada" && !ORIGENS_NAO_CAIXA.includes(t.origem)).reduce((s, t) => s + Number(t.valor), 0);
      const sai = m.transacoes_mes.filter(t => t.tipo === "saida" && !ORIGENS_NAO_CAIXA.includes(t.origem)).reduce((s, t) => s + Number(t.valor), 0);
      return acc + (ent - sai);
    }, 0);
  }
  const saldo = saldoAnterior + saldoDoMes;

  // extrato de intervalo (só roda se vier de/ate na URL)
  let extrato = null;
  if (sp.de && sp.ate) {
    const { meses: mesesRange } = await nhostQuery(EXTRATO_RANGE, {
      inicio: primeiroDia(sp.de),
      fim: primeiroDia(sp.ate),
    });

    const porMes = mesesRange.map(m => {
      const ent = m.transacoes_mes
        .filter(t => t.tipo === "entrada" && !ORIGENS_NAO_REAIS.includes(t.origem))
        .reduce((s, t) => s + Number(t.valor), 0);
      const sai = m.transacoes_mes
        .filter(t => t.tipo === "saida" && !ORIGENS_NAO_REAIS.includes(t.origem))
        .reduce((s, t) => s + Number(t.valor), 0);
      const itens = m.transacoes_mes.map(t => ({
        ...t,
        data: new Date(t.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      }));
      return { mes: m.mes, entradas: ent, saidas: sai, saldo: ent - sai, itens };
    });

    const totalGeral = porMes.reduce((acc, m) => ({
      entradas: acc.entradas + m.entradas,
      saidas: acc.saidas + m.saidas,
      saldo: acc.saldo + m.saldo,
    }), { entradas: 0, saidas: 0, saldo: 0 });

    extrato = { porMes, totalGeral };
  }

  const mesAnterior = mesAdjacente(mesYYYYMM, -1);
  const mesSeguinte = mesAdjacente(mesYYYYMM, 1);

  return (
    <div className="wrap">
      <h1>Painel financeiro</h1>
      <p className="sub">Entradas e saídas do mês, mês a mês.</p>
      {erro && (
        <Toast mensagem={erro} />
      )}

      <div className="receipt">
        <div className="month-nav">
          <a href={`/?mes=${mesAnterior}`}>&larr;</a>
          <span className="month-label">
            {mesYYYYMM} {mesInfo?.fechado ? "· fechado" : mesInfo ? "· em aberto" : "· sem dados"}
          </span>
          <a href={`/?mes=${mesSeguinte}`}>&rarr;</a>
        </div>
        {!mesInfo && <div className="empty">Esse mês ainda não existe no sistema.</div>}
        {mesInfo && (
          <>
            <div className="receipt-row"><span className="label">Entradas reais</span><span>{fmt(totalEntradasReais)}</span></div>
            <div className="receipt-row"><span className="label">Saídas reais</span><span>{fmt(totalSaidasReais)}</span></div>
            {totalAportado > 0 && <div className="receipt-row"><span className="label">Guardado em metas</span><span>{fmt(totalAportado)}</span></div>}
            {totalRetirado > 0 && <div className="receipt-row"><span className="label">Retirado de metas</span><span>{fmt(totalRetirado)}</span></div>}
            {totalAplicado > 0 && <div className="receipt-row"><span className="label">Aplicado em investimentos</span><span>{fmt(totalAplicado)}</span></div>}
            {totalResgatado > 0 && <div className="receipt-row"><span className="label">Resgatado de investimentos</span><span>{fmt(totalResgatado)}</span></div>}
            <div className="receipt-row total"><span className="label">Saldo de caixa</span><span>{fmt(saldo)}</span></div>
          </>
        )}
      </div>

      {mesInfo && (
        <>
          <details className="dash-section">
            <summary className="dash-summary">
              <span>Entradas</span>
              <span className="dash-summary-meta">{entradas.length} · {fmt(totalEntradasReais)}</span>
            </summary>
            <ListaTransacoes
              items={entradas}
              stamps={{
                recorrente: { texto: "recorrente", teal: false },
                meta_retirada: { texto: "meta", teal: true },
                meta_compra: { texto: "meta", teal: true },
                investimento_resgate: { texto: "investimento", teal: true },
              }}
              deletavelOrigens={["avulso", "recorrente"]}
              mesFechado={mesInfo.fechado}
              vazioTexto="Nenhuma entrada neste mês."
              categorias={categorias}
            />
            {!mesInfo.fechado && (
              <form action={adicionarAvulso} className="add-form">
                <input type="hidden" name="id_mes" value={mesInfo.id_mes} />
                <input type="hidden" name="tipo" value="entrada" />
                <input type="hidden" name="mes" value={mesYYYYMM} />
                <input className="name" name="nome" placeholder="Entrada avulsa" required />
                <input className="value" name="valor" placeholder="Valor" type="number" step="0.01" required />
                <SubmitButton>+</SubmitButton>
              </form>
            )}
          </details>

          <details className="dash-section">
            <summary className="dash-summary">
              <span>Saídas</span>
              <span className="dash-summary-meta">{saidas.length} · {fmt(totalSaidasReais)}</span>
            </summary>
            <ListaTransacoes
              items={saidas}
              stamps={{
                custo_fixo: { texto: "fixo", teal: false },
                meta_aporte: { texto: "meta", teal: true },
                meta_compra: { texto: "meta", teal: true },
                investimento_aporte: { texto: "investimento", teal: true },
                parcelamento: { texto: "parcela", teal: false },
              }}
              deletavelOrigens={["avulso", "custo_fixo"]}
              mesFechado={mesInfo.fechado}
              vazioTexto="Nenhuma saída neste mês."
              categorias={categorias}
            />
            {!mesInfo.fechado && (
              <form action={adicionarAvulso} className="add-form">
                <input type="hidden" name="id_mes" value={mesInfo.id_mes} />
                <input type="hidden" name="tipo" value="saida" />
                <input type="hidden" name="mes" value={mesYYYYMM} />
                <input className="name" name="nome" placeholder="Saída avulsa" required />
                <input className="value" name="valor" placeholder="Valor" type="number" step="0.01" required />
                <SubmitButton>+</SubmitButton>
              </form>
            )}
          </details>

          <details className="dash-section">
            <summary className="dash-summary">
              <span>Parcelamentos</span>
              <span className="dash-summary-meta">{parcelamentos.length}</span>
            </summary>
            <p className="sub" style={{ margin: "0 0 8px" }}>A 1ª parcela só entra no mês seguinte.</p>
            {parcelamentos.length === 0 && <div className="empty">Nenhum parcelamento ativo.</div>}
            {parcelamentos.map((p) => (
              editandoParcelamento === p.id_parcelamento ? (
                <div className="edit-card" key={p.id_parcelamento}>
                  <form action={editarParcelamento} className="edit-grid">
                    <input type="hidden" name="id" value={p.id_parcelamento} />
                    <input type="hidden" name="parcelas_pagas" value={p.parcelas_pagas} />
                    <input type="hidden" name="mes" value={mesYYYYMM} />
                    <label className="field field-wide">
                      <span>Descrição</span>
                      <input name="descricao" defaultValue={p.descricao} required />
                    </label>
                    <label className="field">
                      <span>Valor da parcela</span>
                      <input name="valor_parcela" type="number" step="0.01" defaultValue={p.valor_parcela} required />
                    </label>
                    <label className="field">
                      <span>Parcelas</span>
                      <input name="qtd_parcelas" type="number" defaultValue={p.qtd_parcelas} min={p.parcelas_pagas + 1} required />
                    </label>
                    <div className="edit-actions">
                      <a href={`/?mes=${mesYYYYMM}`} className="btn-link">cancelar</a>
                      <SubmitButton className="btn-link primary">salvar</SubmitButton>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="parcel-row" key={p.id_parcelamento}>
                  <span className="name">{p.descricao}</span>
                  <span className="meta">{p.parcelas_pagas}/{p.qtd_parcelas} · próxima {p.proximo_mes?.slice(0, 7)}</span>
                  <span className="value">{fmt(p.valor_parcela)}</span>
                  <div className="row-actions">
                    <a href={`/?mes=${mesYYYYMM}&editarParcelamento=${p.id_parcelamento}`} className="btn-link">editar</a>
                    <form action={excluirParcelamento}>
                      <input type="hidden" name="id" value={p.id_parcelamento} />
                      <SubmitButton className="del" title="excluir parcelamento">×</SubmitButton>
                    </form>
                  </div>
                </div>
              )
            ))}
            {!mesInfo.fechado && (
              <form action={comprarAvulsoParcelado} className="add-form">
                <input type="hidden" name="mes" value={mesYYYYMM} />
                <input className="name" name="nome" placeholder="Descrição da compra" required />
                <input className="value" name="valor_total" placeholder="Valor total" type="number" step="0.01" />
                <input className="value" name="valor_parcela" placeholder="ou valor da parcela" type="number" step="0.01" />
                <input name="qtd_parcelas" type="number" placeholder="parcelas" style={{ width: 80 }} required />
                <SubmitButton>parcelar</SubmitButton>
              </form>
            )}
          </details>

          {!mesInfo.fechado && (recorrentesPendentes.length > 0 || custosPendentes.length > 0) && (
            <details className="dash-section">
              <summary className="dash-summary">
                <span>Pendentes</span>
                <span className="dash-summary-meta">{recorrentesPendentes.length + custosPendentes.length}</span>
              </summary>
              <p className="sub" style={{ margin: "0 0 8px" }}>Ainda não confirmados neste mês.</p>
              {recorrentesPendentes.map((r) => (
                <div className="item-row" key={r.id_recorrente}>
                  <span className="stamp ok" style={{opacity: 0.6}}>recorrente</span>
                  <span className="name">{r.nome}</span>
                  <span className="value">{fmt(r.valor)}</span>
                  <form action={confirmarRecorrente}>
                    <input type="hidden" name="id_mes" value={mesInfo.id_mes} />
                    <input type="hidden" name="mes" value={mesYYYYMM} />
                    <input type="hidden" name="nome" value={r.nome} />
                    <input type="hidden" name="valor" value={r.valor} />
                    <SubmitButton className="btn-link">confirmar</SubmitButton>
                  </form>
                </div>
              ))}
              {custosPendentes.map((c) => (
                <div className="item-row" key={c.id_custo_fx}>
                  <span className="stamp ok" style={{opacity: 0.6}}>fixo</span>
                  <span className="name">{c.nome}</span>
                  <span className="value">{fmt(c.valor)}</span>
                  <form action={confirmarCustoFixo}>
                    <input type="hidden" name="id_mes" value={mesInfo.id_mes} />
                    <input type="hidden" name="mes" value={mesYYYYMM} />
                    <input type="hidden" name="nome" value={c.nome} />
                    <input type="hidden" name="valor" value={c.valor} />
                    <SubmitButton className="btn-link">confirmar</SubmitButton>
                  </form>
                </div>
              ))}
            </details>
          )}
        </>
      )}

      <section>
        <h2>Extrato por período</h2>
        <form method="GET" className="add-form">
          <input type="hidden" name="mes" value={mesYYYYMM} />
          <input type="month" name="de" defaultValue={sp.de || ""} required />
          <span style={{ alignSelf: "center" }}>até</span>
          <input type="month" name="ate" defaultValue={sp.ate || ""} required />
          <SubmitButton>Ver extrato</SubmitButton>
        </form>

        {extrato && (
          <>
            <div className="receipt" style={{ marginTop: 16 }}>
              <div className="receipt-row"><span className="label">Total arrecadado</span><span>{fmt(extrato.totalGeral.entradas)}</span></div>
              <div className="receipt-row"><span className="label">Total gasto</span><span>{fmt(extrato.totalGeral.saidas)}</span></div>
              <div className="receipt-row total"><span className="label">Saldo do período</span><span>{fmt(extrato.totalGeral.saldo)}</span></div>
            </div>

            {extrato.porMes.map((m) => (
              <details key={m.mes}>
                <summary className="item-row group-summary" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <strong>{m.mes.slice(0, 7)}</strong>
                  <span>Entradas: {fmt(m.entradas)} · Saídas: {fmt(m.saidas)} · Saldo: {fmt(m.saldo)}</span>
                </summary>
                <div className="group-items">
                  {m.itens.length === 0 && <div className="empty">Nenhum lançamento neste mês.</div>}
                  {m.itens.map((t, i) => (
                    <div className="item-row" key={i}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--ink-soft)", minWidth: 40 }}>{t.data}</span>
                      <span className="name">
                        {t.nome}
                        {t.categoria && <small style={{ color: "var(--ink-soft)" }}> · {t.categoria.nome}</small>}
                      </span>
                      <span className="value" style={{ color: t.tipo === "entrada" ? "var(--teal)" : "var(--ink)" }}>
                        {t.tipo === "entrada" ? "+" : "-"}{fmt(t.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
