import Toast from "../../Toast";
import { nhostQuery } from "@/lib/nhost";
import { INVESTIMENTO_BY_ID, TRANSACOES_INVESTIMENTO, MES_INFO } from "@/lib/queries";
import { guardarNoInvestimento, retirarDoInvestimento, atualizarValorInvestimento, atualizarTaxaInvestimento } from "../../actions";
import SubmitButton from "../../components/SubmitButton";

function fmt(n) { return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }

export default async function InvestimentoDetalhe({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const erro = sp.erro === "valor_invalido" ? "Informe um valor válido, maior que zero." : null;
  const mesYYYYMM = new Date().toISOString().slice(0, 7);

  const { meses } = await nhostQuery(MES_INFO, { mes: mesYYYYMM + "-01" });
  const mesInfo = meses[0];

  const { investimentos_by_pk: inv } = await nhostQuery(INVESTIMENTO_BY_ID, { id });
  const { transacoes_mes } = await nhostQuery(TRANSACOES_INVESTIMENTO, { id });

  const totalGuardado = transacoes_mes
    .filter(t => t.tipo === "saida")
    .reduce((s, t) => s + Number(t.valor), 0);
  const totalRetirado = transacoes_mes
    .filter(t => t.tipo === "entrada")
    .reduce((s, t) => s + Number(t.valor), 0);
  const rendimento = Number(inv.valor_atual) - (totalGuardado - totalRetirado);

  return (
    <div className="wrap">
      <a href="/investimentos" className="btn-link">&larr; voltar</a>
      <h1>{inv.nome}</h1>
      {erro && <Toast mensagem={erro} />}

      <div className="receipt">
        <div className="receipt-row"><span className="label">Total guardado</span><span>{fmt(totalGuardado)}</span></div>
        <div className="receipt-row"><span className="label">Total retirado</span><span>{fmt(totalRetirado)}</span></div>
        <div className="receipt-row">
          <span className="label">Rendimento acumulado</span>
          <span style={{color: rendimento >= 0 ? "var(--teal)" : "var(--rust)"}}>
            {rendimento >= 0 ? "+" : ""}{fmt(rendimento)}
          </span>
        </div>
        <div className="receipt-row total"><span className="label">Valor atual</span><span>{fmt(inv.valor_atual)}</span></div>
      </div>

      <section>
        <h2>Movimentar</h2>
        <div className="goal-edit">
          <form action={guardarNoInvestimento} style={{display: "flex", gap: 8}}>
            <input type="hidden" name="id" value={inv.id_investimento} />
            <input type="hidden" name="nome" value={inv.nome} />
            <input type="hidden" name="id_mes" value={mesInfo?.id_mes} />
            <input type="hidden" name="redirect_to" value={`/investimentos/${inv.id_investimento}`} />
            <input name="valor" type="number" step="0.01" placeholder="valor" required />
            <SubmitButton>guardar</SubmitButton>
          </form>
          <form action={retirarDoInvestimento} style={{display: "flex", gap: 8}}>
            <input type="hidden" name="id" value={inv.id_investimento} />
            <input type="hidden" name="nome" value={inv.nome} />
            <input type="hidden" name="id_mes" value={mesInfo?.id_mes} />
            <input type="hidden" name="redirect_to" value={`/investimentos/${inv.id_investimento}`} />
            <input name="valor" type="number" step="0.01" placeholder="valor" required />
            <SubmitButton>retirar</SubmitButton>
          </form>
        </div>
      </section>

      <section>
        <h2>Atualizar valor real <small>(conforme extrato do banco)</small></h2>
        <form action={atualizarValorInvestimento} className="add-form">
          <input type="hidden" name="id" value={inv.id_investimento} />
          <input className="value" name="valor_atual" type="number" step="0.01" placeholder={`atual: ${inv.valor_atual}`} required />
          <SubmitButton>atualizar</SubmitButton>
        </form>
      </section>

      <section>
        <h2>Taxa contratada <small>(informativo)</small></h2>
        <form action={atualizarTaxaInvestimento} className="add-form">
          <input type="hidden" name="id" value={inv.id_investimento} />
          <input name="percentual_cdi" type="number" step="0.01" placeholder="% do CDI" defaultValue={inv.percentual_cdi} style={{width: 100}} required />
          <input name="cdi_atual" type="number" step="0.01" placeholder="CDI a.a." defaultValue={inv.cdi_atual} style={{width: 100}} required />
          <SubmitButton>salvar</SubmitButton>
        </form>
      </section>

      <section>
        <h2>Transações</h2>
        {transacoes_mes.length === 0 && <div className="empty">Nenhuma transação ainda.</div>}
        {transacoes_mes.map((t) => (
          <div className="item-row" key={t.id_transacao}>
            <span className="name">{t.nome}</span>
            <span style={{fontSize: 12, color: "var(--ink-soft)", marginRight: 8}}>{t.mes?.mes?.slice(0, 7)}</span>
            <span className="value" style={{color: t.tipo === "entrada" ? "var(--teal)" : "var(--ink)"}}>
              {t.tipo === "entrada" ? "+" : "-"}{fmt(t.valor)}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}