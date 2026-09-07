import { nhostQuery } from "./nhost";
import { MES_INFO, TRANSACOES_DO_MES, SALDO_ANTES_DE } from "./queries";

// mesma exclusão usada no Painel: meta_compra é só um lançamento contábil
// dentro da meta (o dinheiro já saiu do caixa no aporte), não deve descontar
// do caixa de novo.
const ORIGENS_NAO_CAIXA = ["meta_compra"];

export async function calcularSaldoAtual(mesYYYYMM) {
  const mesData = mesYYYYMM + "-01";

  const { meses: mesRows } = await nhostQuery(MES_INFO, { mes: mesData });
  const mesInfo = mesRows[0];
  if (!mesInfo) return 0;

  const { transacoes_mes } = await nhostQuery(TRANSACOES_DO_MES, { id_mes: mesInfo.id_mes });
  const totalEntradas = transacoes_mes
    .filter(t => t.tipo === "entrada" && !ORIGENS_NAO_CAIXA.includes(t.origem))
    .reduce((s, t) => s + Number(t.valor), 0);
  const totalSaidas = transacoes_mes
    .filter(t => t.tipo === "saida" && !ORIGENS_NAO_CAIXA.includes(t.origem))
    .reduce((s, t) => s + Number(t.valor), 0);
  const saldoDoMes = totalEntradas - totalSaidas;

  const { meses: mesesAnteriores } = await nhostQuery(SALDO_ANTES_DE, { antes: mesData });
  const saldoAnterior = mesesAnteriores.reduce((acc, m) => {
    const ent = m.transacoes_mes.filter(t => t.tipo === "entrada" && !ORIGENS_NAO_CAIXA.includes(t.origem)).reduce((s, t) => s + Number(t.valor), 0);
    const sai = m.transacoes_mes.filter(t => t.tipo === "saida" && !ORIGENS_NAO_CAIXA.includes(t.origem)).reduce((s, t) => s + Number(t.valor), 0);
    return acc + (ent - sai);
  }, 0);

  return saldoAnterior + saldoDoMes;
}
