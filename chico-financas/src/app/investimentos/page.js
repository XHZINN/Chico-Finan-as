import Toast from "../Toast";
import { nhostQuery } from "@/lib/nhost";
import { INVESTIMENTOS, MES_INFO } from "@/lib/queries";
import { adicionarInvestimento, guardarNoInvestimento, retirarDoInvestimento } from "../actions";
import SubmitButton from "../components/SubmitButton";

function fmt(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export default async function Investimentos({ searchParams }) {
  const sp = await searchParams;
  const erro = sp.erro === "valor_invalido" ? "Informe um valor válido, maior que zero." : null;

  const mesYYYYMM = new Date().toISOString().slice(0, 7);
  const { meses } = await nhostQuery(MES_INFO, { mes: mesYYYYMM + "-01" });
  const mesInfo = meses[0];

  const { investimentos } = await nhostQuery(INVESTIMENTOS);

  return (
    <div className="wrap">
      <h1>Investimentos</h1>
      <p className="sub">Aplicações e resgates.</p>
      {erro && <Toast mensagem={erro} />}

      <section>
        {investimentos.length === 0 && <div className="empty">Nenhum investimento cadastrado.</div>}
        {investimentos.map((inv) => (
          <div className="goal-card" key={inv.id_investimento}>
            <div className="goal-nums">
              <strong>{inv.nome}</strong> — {fmt(inv.valor_atual)}
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}> · {inv.percentual_cdi}% do CDI ({inv.cdi_atual}% a.a.)</span>
            </div>
            <div className="goal-edit">
              <form action={guardarNoInvestimento} style={{ display: "flex", gap: 8 }}>
                <input type="hidden" name="id" value={inv.id_investimento} />
                <input type="hidden" name="nome" value={inv.nome} />
                <input type="hidden" name="id_mes" value={mesInfo?.id_mes} />
                <input type="hidden" name="redirect_to" value="/investimentos" />
                <input name="valor" type="number" step="0.01" placeholder="valor" required />
                <SubmitButton>guardar</SubmitButton>
              </form>
              <form action={retirarDoInvestimento} style={{ display: "flex", gap: 8 }}>
                <input type="hidden" name="id" value={inv.id_investimento} />
                <input type="hidden" name="nome" value={inv.nome} />
                <input type="hidden" name="id_mes" value={mesInfo?.id_mes} />
                <input type="hidden" name="redirect_to" value="/investimentos" />
                <input name="valor" type="number" step="0.01" placeholder="valor" required />
                <SubmitButton>retirar</SubmitButton>
              </form>
            </div>
            <a href={`/investimentos/${inv.id_investimento}`} className="btn-link primary">ver detalhes →</a>
          </div>
        ))}
      </section>

      <section>
        <h2>Novo investimento</h2>
        <form action={adicionarInvestimento} className="add-form">
          <input type="hidden" name="id_mes" value={mesInfo?.id_mes} />
          <input className="name" name="nome" placeholder="Nome" required />
          <input className="name" name="tipo" placeholder="Tipo (ex: CDB, Tesouro)" required style={{ maxWidth: 160 }} />
          <input className="value" name="valor" placeholder="Valor aplicado" type="number" step="0.01" required />
          <SubmitButton>+</SubmitButton>
        </form>
      </section>
    </div>
  );
}
