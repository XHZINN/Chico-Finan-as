import Toast from "./Toast";
import { nhostQuery } from "@/lib/nhost";
import {
  MES_INFO, TRANSACOES_DO_MES, ATIVOS, TODOS_RECORRENTES_CUSTOS, METAS, EXTRATO_RANGE,
} from "@/lib/queries";
import {
  adicionarAvulso, adicionarRecorrente, adicionarCustoFixo,
  toggleRecorrente, toggleCustoFixo, retirarDaMeta,
  adicionarMeta, guardarNaMeta, deletarMeta, deletarAvulso,
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

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const mesYYYYMM = sp.mes || new Date().toISOString().slice(0, 7);
  const erro =
  sp.erro === "retirada" ? "Você não pode retirar mais do que já guardou nessa meta." :
  sp.erro === "aporte_excede" ? "Esse aporte ultrapassaria o valor alvo da meta." :
  null;
  const mesData = primeiroDia(mesYYYYMM);

  // dados do mês navegado
  const { meses: mesRows } = await nhostQuery(MES_INFO, { mes: mesData });
  const mesInfo = mesRows[0];

  let entradas = [];
  let saidas = [];

  if (mesInfo) {
    const { transacoes_mes } = await nhostQuery(TRANSACOES_DO_MES, { id_mes: mesInfo.id_mes });
    entradas = transacoes_mes.filter(t => t.tipo === "entrada");
    saidas = transacoes_mes.filter(t => t.tipo === "saida");

    if (!mesInfo.fechado) {
      // mês aberto: soma o que ainda não foi congelado
      const { recorrentes, custos_fixos } = await nhostQuery(ATIVOS);
      entradas = [...entradas, ...recorrentes.map(r => ({ id_transacao: "r-" + r.id_recorrente, nome: r.nome, valor: r.valor, tipo: "entrada", origem: "recorrente" }))];
      saidas = [...saidas, ...custos_fixos.map(c => ({ id_transacao: "c-" + c.id_custo_fx, nome: c.nome, valor: c.valor, tipo: "saida", origem: "custo_fixo" }))];
    }
  }

  const totalEntradas = entradas.reduce((s, e) => s + Number(e.valor), 0);
  const totalSaidas = saidas.reduce((s, e) => s + Number(e.valor), 0);
  const saldo = totalEntradas - totalSaidas;

  // recorrentes/custos fixos (gestão, independe do mês)
  const { recorrentes: todosRecorrentes, custos_fixos: todosCustos } = await nhostQuery(TODOS_RECORRENTES_CUSTOS);

  // metas
  const { metas } = await nhostQuery(METAS);

  // extrato de intervalo (só roda se vier de/ate na URL)
  let extrato = null;
  if (sp.de && sp.ate) {
    const { meses: mesesRange } = await nhostQuery(EXTRATO_RANGE, {
      inicio: primeiroDia(sp.de),
      fim: primeiroDia(sp.ate),
    });

    let ativosExtras = null;
    const precisaAtivos = mesesRange.some(m => !m.fechado);
    if (precisaAtivos) {
      ativosExtras = await nhostQuery(ATIVOS);
    }

    const porMes = mesesRange.map(m => {
      let ent = m.transacoes_mes.filter(t => t.tipo === "entrada").reduce((s, t) => s + Number(t.valor), 0);
      let sai = m.transacoes_mes.filter(t => t.tipo === "saida").reduce((s, t) => s + Number(t.valor), 0);
      if (!m.fechado && ativosExtras) {
        ent += ativosExtras.recorrentes.reduce((s, r) => s + Number(r.valor), 0);
        sai += ativosExtras.custos_fixos.reduce((s, c) => s + Number(c.valor), 0);
      }
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
      <p className="sub">Entradas, custos fixos e metas — mês a mês.</p>
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
            <div className="receipt-row"><span className="label">Entradas</span><span>{fmt(totalEntradas)}</span></div>
            <div className="receipt-row"><span className="label">Saídas</span><span>{fmt(totalSaidas)}</span></div>
            <div className="receipt-row total"><span className="label">Saldo</span><span>{fmt(saldo)}</span></div>
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
                <span className="name">{e.nome}</span>
                <span className="value">{fmt(e.valor)}</span>
                {e.origem === "avulso" && !mesInfo.fechado && (
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
                <span className="name">{s.nome}</span>
                <span className="value">{fmt(s.valor)}</span>
                {s.origem === "avulso" && !mesInfo.fechado && (
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
                <input className="name" name="nome" placeholder="Saída avulsa" required />
                <input className="value" name="valor" placeholder="Valor" type="number" step="0.01" required />
                <button type="submit">+</button>
              </form>
            )}
          </section>
        </>
      )}

      <section>
        <h2>Recorrentes <small>(entradas fixas — controle geral, não muda por mês)</small></h2>
        {todosRecorrentes.map((r) => (
          <div className="item-row" key={r.id_recorrente}>
            <span className="stamp ok" style={{ opacity: r.status ? 1 : 0.35 }}>{r.status ? "ativo" : "inativo"}</span>
            <span className="name">{r.nome}</span>
            <span className="value">{fmt(r.valor)}</span>
            <form action={toggleRecorrente}>
              <input type="hidden" name="id" value={r.id_recorrente} />
              <input type="hidden" name="status" value={r.status} />
              <button className="del" type="submit">{r.status ? "desativar" : "ativar"}</button>
            </form>
          </div>
        ))}
        <form action={adicionarRecorrente} className="add-form">
          <input className="name" name="nome" placeholder="Nome" required />
          <input className="value" name="valor" placeholder="Valor" type="number" step="0.01" required />
          <button type="submit">+</button>
        </form>
      </section>

      <section>
        <h2>Custos fixos <small>(controle geral, não muda por mês)</small></h2>
        {todosCustos.map((c) => (
          <div className="item-row" key={c.id_custo_fx}>
            <span className="stamp ok" style={{ opacity: c.status ? 1 : 0.35 }}>{c.status ? "ativo" : "inativo"}</span>
            <span className="name">{c.nome}</span>
            <span className="value">{fmt(c.valor)}</span>
            <form action={toggleCustoFixo}>
              <input type="hidden" name="id" value={c.id_custo_fx} />
              <input type="hidden" name="status" value={c.status} />
              <button className="del" type="submit">{c.status ? "desativar" : "ativar"}</button>
            </form>
          </div>
        ))}
        <form action={adicionarCustoFixo} className="add-form">
          <input className="name" name="nome" placeholder="Nome" required />
          <input className="value" name="valor" placeholder="Valor" type="number" step="0.01" required />
          <button type="submit">+</button>
        </form>
      </section>

      <section>
        <h2>Metas</h2>
        {metas.length === 0 && <div className="empty">Nenhuma meta cadastrada.</div>}
        {metas.map((g) => {
          const pct = Math.min(100, Math.round((g.valor_atual / g.meta) * 100));
          return (
            <div className="goal-card" key={g.id_meta}>
              <div className="goal-nums">{fmt(g.valor_atual)} de {fmt(g.meta)} · {pct}%</div>
              <div className="goal-bar-bg"><div className="goal-bar-fill" style={{ width: `${pct}%` }} /></div>
              <div className="goal-edit">
                <form action={guardarNaMeta} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="id" value={g.id_meta} />
                  <input type="hidden" name="nome_meta" value={g.nome} />
                  <input type="hidden" name="id_mes" value={mesInfo?.id_mes} />
                  <input type="hidden" name="mes" value={mesYYYYMM} />
                  <input name="valor" type="number" step="0.01" placeholder="valor" required />
                  <button type="submit">guardar</button>
                </form>
                <form action={retirarDaMeta} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="id" value={g.id_meta} />
                  <input type="hidden" name="nome_meta" value={g.nome} />
                  <input type="hidden" name="id_mes" value={mesInfo?.id_mes} />
                  <input type="hidden" name="mes" value={mesYYYYMM} />
                  <input name="valor" type="number" step="0.01" placeholder="valor" required />
                  <button type="submit">retirar</button>
                </form>
                <form action={deletarMeta}>
                  <input type="hidden" name="id" value={g.id_meta} />
                  <button className="goal-remove" type="submit">remover</button>
                </form>
              </div>
            </div>
          );
        })}
        <form action={adicionarMeta} className="add-form">
          <input className="name" name="nome" placeholder="Nome da meta" required />
          <input className="value" name="meta" placeholder="Valor alvo" type="number" step="0.01" required />
          <button type="submit">+</button>
        </form>
      </section>

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