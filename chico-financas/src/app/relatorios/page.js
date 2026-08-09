import { nhostQuery } from "@/lib/nhost";
import { CATEGORIAS_COM_PALAVRAS, TODOS_MESES_COM_TRANSACOES, METAS, INVESTIMENTOS } from "@/lib/queries";
import RelatoriosGraficos from "./RelatoriosGraficos";

const CORES_CATEGORIA = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const COR_SEM_CATEGORIA = "#898781";
const ORIGENS_REAIS = ["avulso", "recorrente", "custo_fixo"];

function mesAdjacente(mesYYYYMM, delta) {
  const d = new Date(mesYYYYMM + "-01T00:00:00");
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 7);
}

export default async function Relatorios({ searchParams }) {
  const sp = await searchParams;
  const mesYYYYMM = sp.mes || new Date().toISOString().slice(0, 7);

  const [{ categorias }, { meses }, { metas }, { investimentos }] = await Promise.all([
    nhostQuery(CATEGORIAS_COM_PALAVRAS),
    nhostQuery(TODOS_MESES_COM_TRANSACOES),
    nhostQuery(METAS),
    nhostQuery(INVESTIMENTOS),
  ]);

  const corPorCategoria = new Map();
  categorias.forEach((c, i) => corPorCategoria.set(c.id_categoria, CORES_CATEGORIA[i % CORES_CATEGORIA.length]));

  function nomeCategoria(t) {
    return t.categoria?.nome || "Sem categoria";
  }
  function corCategoria(t) {
    return t.id_categoria ? (corPorCategoria.get(t.id_categoria) || COR_SEM_CATEGORIA) : COR_SEM_CATEGORIA;
  }

  // gasto por categoria no mês navegado
  const mesAtualRow = meses.find(m => m.mes.slice(0, 7) === mesYYYYMM);
  const gastosPorCategoriaMap = new Map();
  if (mesAtualRow) {
    for (const t of mesAtualRow.transacoes_mes) {
      if (t.tipo !== "saida" || !ORIGENS_REAIS.includes(t.origem)) continue;
      const nome = nomeCategoria(t);
      const atual = gastosPorCategoriaMap.get(nome) || { nome, valor: 0, cor: corCategoria(t) };
      atual.valor += Number(t.valor);
      gastosPorCategoriaMap.set(nome, atual);
    }
  }
  const gastoPorCategoriaMes = Array.from(gastosPorCategoriaMap.values()).sort((a, b) => b.valor - a.valor);

  // evolução mensal por categoria — últimos 6 meses
  const ultimosMeses = meses.slice(-6);
  const nomesCategoriasEvolucao = new Set();
  const evolucaoMensal = ultimosMeses.map((m) => {
    const linha = { mes: m.mes.slice(0, 7) };
    for (const t of m.transacoes_mes) {
      if (t.tipo !== "saida" || !ORIGENS_REAIS.includes(t.origem)) continue;
      const nome = nomeCategoria(t);
      nomesCategoriasEvolucao.add(nome);
      linha[nome] = (linha[nome] || 0) + Number(t.valor);
    }
    return linha;
  });
  const categoriasEvolucao = Array.from(nomesCategoriasEvolucao).map(nome => {
    const exemplo = ultimosMeses.flatMap(m => m.transacoes_mes).find(t => nomeCategoria(t) === nome);
    return { nome, cor: exemplo ? corCategoria(exemplo) : COR_SEM_CATEGORIA };
  });

  // entradas vs saídas reais, todos os meses
  const entradasSaidasTempo = meses.map((m) => {
    const entradas = m.transacoes_mes
      .filter(t => t.tipo === "entrada" && t.origem !== "meta_retirada")
      .reduce((s, t) => s + Number(t.valor), 0);
    const saidas = m.transacoes_mes
      .filter(t => t.tipo === "saida" && t.origem !== "meta_aporte")
      .reduce((s, t) => s + Number(t.valor), 0);
    return { mes: m.mes.slice(0, 7), entradas, saidas };
  });

  // metas e investimentos — valor guardado/aplicado atual
  const metasInvestimentos = [
    ...metas.map(m => ({ nome: `Meta: ${m.nome}`, valor: Number(m.valor_atual) })),
    ...investimentos.map(i => ({ nome: `Investimento: ${i.nome}`, valor: Number(i.valor_atual) })),
  ];

  const mesAnterior = mesAdjacente(mesYYYYMM, -1);
  const mesSeguinte = mesAdjacente(mesYYYYMM, 1);

  return (
    <div className="wrap">
      <h1>Relatórios</h1>
      <p className="sub">Fluxo de gasto por categoria e visão geral financeira.</p>

      <RelatoriosGraficos
        mesYYYYMM={mesYYYYMM}
        mesAnterior={mesAnterior}
        mesSeguinte={mesSeguinte}
        gastoPorCategoriaMes={gastoPorCategoriaMes}
        evolucaoMensal={evolucaoMensal}
        categoriasEvolucao={categoriasEvolucao}
        entradasSaidasTempo={entradasSaidasTempo}
        metasInvestimentos={metasInvestimentos}
      />
    </div>
  );
}
