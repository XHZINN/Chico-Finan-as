import Toast from "../Toast";
import { nhostQuery } from "@/lib/nhost";
import { METAS, MES_INFO } from "@/lib/queries";
import { adicionarMeta, guardarNaMeta, retirarDaMeta, deletarMeta } from "../actions";
import SubmitButton from "../components/SubmitButton";

function fmt(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export default async function Metas({ searchParams }) {
  const sp = await searchParams;
  const erro =
    sp.erro === "valor_invalido" ? "Informe um valor válido, maior que zero." :
    sp.erro === "retirada" ? "Você não pode retirar mais do que já guardou nessa meta." :
    sp.erro === "aporte_excede" ? "Esse aporte ultrapassaria o valor alvo da meta." :
    sp.erro === "meta_invalida" ? "Meta não encontrada." :
    null;

  const mesYYYYMM = new Date().toISOString().slice(0, 7);
  const { meses } = await nhostQuery(MES_INFO, { mes: mesYYYYMM + "-01" });
  const mesInfo = meses[0];

  const { metas } = await nhostQuery(METAS);

  return (
    <div className="wrap">
      <h1>Metas</h1>
      <p className="sub">Guarde dinheiro pra objetivos específicos.</p>
      {erro && <Toast mensagem={erro} />}

      <section>
        {metas.length === 0 && <div className="empty">Nenhuma meta cadastrada.</div>}
        {metas.map((g) => {
          const pct = Math.min(100, Math.round((g.valor_atual / g.meta) * 100));
          return (
            <div className="goal-card" key={g.id_meta}>
              <div className="goal-nums"><strong>{g.nome}</strong> — {fmt(g.valor_atual)} de {fmt(g.meta)} · {pct}%</div>
              <div className="goal-bar-bg"><div className="goal-bar-fill" style={{ width: `${pct}%` }} /></div>
              <div className="goal-edit">
                <form action={guardarNaMeta} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="id" value={g.id_meta} />
                  <input type="hidden" name="nome_meta" value={g.nome} />
                  <input type="hidden" name="id_mes" value={mesInfo?.id_mes} />
                  <input name="valor" type="number" step="0.01" placeholder="valor" required />
                  <SubmitButton>guardar</SubmitButton>
                </form>
                <form action={retirarDaMeta} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="id" value={g.id_meta} />
                  <input type="hidden" name="nome_meta" value={g.nome} />
                  <input type="hidden" name="id_mes" value={mesInfo?.id_mes} />
                  <input name="valor" type="number" step="0.01" placeholder="valor" required />
                  <SubmitButton>retirar</SubmitButton>
                </form>
                <form action={deletarMeta}>
                  <input type="hidden" name="id" value={g.id_meta} />
                  <SubmitButton className="goal-remove">remover</SubmitButton>
                </form>
              </div>
              <a href={`/metas/${g.id_meta}`} className="btn-link primary">ver itens →</a>
            </div>
          );
        })}
        <form action={adicionarMeta} className="add-form">
          <input className="name" name="nome" placeholder="Nome da meta" required />
          <input className="value" name="meta" placeholder="Valor alvo" type="number" step="0.01" required />
          <SubmitButton>+</SubmitButton>
        </form>
      </section>
    </div>
  );
}
