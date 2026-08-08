import Toast from "./Toast";
import { nhostQuery } from "@/lib/nhost";
import {
  MES_INFO, TRANSACOES_DO_MES, ATIVOS, EXTRATO_RANGE, SALDO_ANTES_DE,
} from "@/lib/queries";
import { adicionarAvulso, deletarAvulso, confirmarRecorrente, confirmarCustoFixo } from "./actions";

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

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const mesYYYYMM = sp.mes || new Date().toISOString().slice(0, 7);
  const erro =
  sp.erro === "valor_invalido" ? "Informe um valor válido, maior que zero." :
  null;
  const mesData = primeiroDia(mesYYYYMM);

  // dados do mês navegado
  const { meses: mesRows } = await nhostQuery(MES_INFO, { mes: mesData });
  const mesInfo = mesRows[0];

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

  const entradasReais = entradas.filter(e => e.origem !== "meta_retirada");
  const saidasReais = saidas.filter(s => s.origem !== "meta_aporte");

  const totalEntradasReais = entradasReais.reduce((s, e) => s + Number(e.valor), 0);
  const totalSaidasReais = saidasReais.reduce((s, e) => s + Number(e.valor), 0);

  const totalAportado = saidas.filter(s => s.origem === "meta_aporte").reduce((s, e) => s + Number(e.valor), 0);
  const totalRetirado = entradas.filter(e => e.origem === "meta_retirada").reduce((s, e) => s + Number(e.valor), 0);

  // saldo do mês (isolado, só o que já foi confirmado/registrado de verdade)
  const totalEntradas = entradas.reduce((s, e) => s + Number(e.valor), 0);
  const totalSaidas = saidas.reduce((s, e) => s + Number(e.valor), 0);
  const saldoDoMes = totalEntradas - totalSaidas;

  // saldo acumulado: soma o saldo de todos os meses anteriores (já fechados) + o saldo deste mês
  let saldoAnterior = 0;
  if (mesInfo) {
    const { meses: mesesAnteriores } = await nhostQuery(SALDO_ANTES_DE, { antes: mesData });
    saldoAnterior = mesesAnteriores.reduce((acc, m) => {
      const ent = m.transacoes_mes.filter(t => t.tipo === "entrada").reduce((s, t) => s + Number(t.valor), 0);
      const sai = m.transacoes_mes.filter(t => t.tipo === "saida").reduce((s, t) => s + Number(t.valor), 0);
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
        .filter(t => t.tipo === "entrada" && t.origem !== "meta_retirada")
        .reduce((s, t) => s + Number(t.valor), 0);
      const sai = m.transacoes_mes
        .filter(t => t.tipo === "saida" && t.origem !== "meta_aporte")
        .reduce((s, t) => s + Number(t.valor), 0);
      return { mes: m.mes, entradas: ent, saidas: sai, saldo: ent - sai };
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
            <div className="receipt-row"><span className="label">Guardado em metas</span><span>{fmt(totalAportado)}</span></div>
            <div className="receipt-row"><span className="label">Retirado de metas</span><span>{fmt(totalRetirado)}</span></div>
            <div className="receipt-row total"><span className="label">Saldo de caixa</span><span>{fmt(saldo)}</span></div>
          </>
        )}
      </div>

      {mesInfo && (
        <>
          <section>
            <h2>Entradas</h2>
            {entradas.length === 0 && <div className="empty">Nenhuma entrada neste mês.</div>}
            {entradas.map((e) => (
              <div className="item-row" key={e.id_transacao}>
                {e.origem === "recorrente" && <span className="stamp ok">recorrente</span>}
                {e.origem === "meta_retirada" && <span className="stamp ok" style={{background: "var(--teal-bg)", color: "var(--teal)", borderColor: "var(--teal)"}}>meta</span>}
                <span className="name">{e.nome}</span>
                <span className="value">{fmt(e.valor)}</span>
                {(e.origem === "avulso" || e.origem === "recorrente") && !mesInfo.fechado && (
                  <form action={deletarAvulso}>
                    <input type="hidden" name="id" value={e.id_transacao} />
                    <button className="del" type="submit">×</button>
                  </form>
                )}
              </div>
            ))}
            {!mesInfo.fechado && (
              <form action={adicionarAvulso} className="add-form">
                <input type="hidden" name="id_mes" value={mesInfo.id_mes} />
                <input type="hidden" name="tipo" value="entrada" />
                <input type="hidden" name="mes" value={mesYYYYMM} />
                <input className="name" name="nome" placeholder="Entrada avulsa" required />
                <input className="value" name="valor" placeholder="Valor" type="number" step="0.01" required />
                <button type="submit">+</button>
              </form>
            )}
          </section>

          <section>
            <h2>Saídas</h2>
            {saidas.length === 0 && <div className="empty">Nenhuma saída neste mês.</div>}
            {saidas.map((s) => (
              <div className="item-row" key={s.id_transacao}>
                {s.origem === "custo_fixo" && <span className="stamp ok">fixo</span>}
                {s.origem === "meta_aporte" && <span className="stamp ok" style={{background: "var(--teal-bg)", color: "var(--teal)", borderColor: "var(--teal)"}}>meta</span>}
                <span className="name">{s.nome}</span>
                <span className="value">{fmt(s.valor)}</span>
                {(s.origem === "avulso" || s.origem === "custo_fixo") && !mesInfo.fechado && (
                  <form action={deletarAvulso}>
                    <input type="hidden" name="id" value={s.id_transacao} />
                    <button className="del" type="submit">×</button>
                  </form>
                )}
              </div>
            ))}
            {!mesInfo.fechado && (
              <form action={adicionarAvulso} className="add-form">
                <input type="hidden" name="id_mes" value={mesInfo.id_mes} />
                <input type="hidden" name="tipo" value="saida" />
                <input type="hidden" name="mes" value={mesYYYYMM} />
                <input className="name" name="nome" placeholder="Saída avulsa" required />
                <input className="value" name="valor" placeholder="Valor" type="number" step="0.01" required />
                <button type="submit">+</button>
              </form>
            )}
          </section>

          {!mesInfo.fechado && (recorrentesPendentes.length > 0 || custosPendentes.length > 0) && (
            <section>
              <h2>Pendentes <small>(ainda não confirmados neste mês)</small></h2>
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
                    <button className="btn-link" type="submit">confirmar</button>
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
                    <button className="btn-link" type="submit">confirmar</button>
                  </form>
                </div>
              ))}
            </section>
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
          <button type="submit">Ver extrato</button>
        </form>

        {extrato && (
          <>
            <div className="receipt" style={{ marginTop: 16 }}>
              <div className="receipt-row"><span className="label">Total arrecadado</span><span>{fmt(extrato.totalGeral.entradas)}</span></div>
              <div className="receipt-row"><span className="label">Total gasto</span><span>{fmt(extrato.totalGeral.saidas)}</span></div>
              <div className="receipt-row total"><span className="label">Saldo do período</span><span>{fmt(extrato.totalGeral.saldo)}</span></div>
            </div>

            {extrato.porMes.map((m) => (
              <div className="item-row" key={m.mes} style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                <strong>{m.mes.slice(0, 7)}</strong>
                <span>Entradas: {fmt(m.entradas)} · Saídas: {fmt(m.saidas)} · Saldo: {fmt(m.saldo)}</span>
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
