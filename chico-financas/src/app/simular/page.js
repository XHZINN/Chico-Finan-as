import { nhostQuery } from "@/lib/nhost";
import { calcularSaldoAtual } from "@/lib/saldo";
import { MES_INFO, TRANSACOES_DO_MES, CATEGORIAS_COM_PALAVRAS } from "@/lib/queries";
import Simulador from "./Simulador";

const ORIGENS_NAO_REAIS = ["meta_aporte", "meta_retirada", "meta_compra", "investimento_aporte", "investimento_resgate"];

export default async function Simular() {
  const mesYYYYMM = new Date().toISOString().slice(0, 7);
  const mesData = mesYYYYMM + "-01";

  const [saldoAtual, { meses: mesRows }, { categorias }] = await Promise.all([
    calcularSaldoAtual(mesYYYYMM),
    nhostQuery(MES_INFO, { mes: mesData }),
    nhostQuery(CATEGORIAS_COM_PALAVRAS),
  ]);
  const mesInfo = mesRows[0];

  let saidasPorCategoria = {};
  if (mesInfo) {
    const { transacoes_mes } = await nhostQuery(TRANSACOES_DO_MES, { id_mes: mesInfo.id_mes });
    const saidasReais = transacoes_mes.filter(t => t.tipo === "saida" && !ORIGENS_NAO_REAIS.includes(t.origem));
    saidasPorCategoria = saidasReais.reduce((acc, t) => {
      const nome = t.categoria?.nome || "Sem categoria";
      acc[nome] = (acc[nome] || 0) + Number(t.valor);
      return acc;
    }, {});
  }

  return (
    <div className="wrap">
      <h1>Simulador</h1>
      <p className="sub">Monte hipóteses de gastos ou ganhos e veja como ficaria seu saldo — nada aqui é salvo, é só pra visualizar.</p>
      <Simulador saldoAtual={saldoAtual} categorias={categorias} saidasPorCategoria={saidasPorCategoria} />
    </div>
  );
}
