import { nhostQuery } from "@/lib/nhost";
import { CATEGORIAS_COM_PALAVRAS, TODOS_MESES_COM_TRANSACOES, METAS, INVESTIMENTOS } from "@/lib/queries";
import RelatoriosGraficos from "./RelatoriosGraficos";

const CORES_CATEGORIA = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const COR_SEM_CATEGORIA = "#898781";
const ORIGENS_REAIS = ["avulso", "recorrente", "custo_fixo"];
// meta_compra é lançamento contábil interno da meta — o dinheiro já saiu do
// caixa no aporte, não deve contar de novo aqui
const ORIGENS_NAO_REAIS_FLUXO = ["meta_aporte", "meta_retirada", "meta_compra", "investimento_aporte", "investimento_resgate"];

function mesAdjacente(mesYYYYMM, delta) {
  const d = new Date(mesYYYYMM + "-01T00:00:00");
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 7);
}

function nomeCategoria(t) {
  return t.categoria?.nome || "Sem categoria";
}

function porCategoriaNoMes(mesRow, tipo, corPorCategoria) {
  const mapa = new Map();
  if (!mesRow) return [];
  for (const t of mesRow.transacoes_mes) {
    if (t.tipo !== tipo || !ORIGENS_REAIS.includes(t.origem)) continue;
    const nome = nomeCategoria(t);
    const atual = mapa.get(nome) || { nome, valor: 0, cor: t.id_categoria ? corPorCategoria.get(t.id_categoria) : COR_SEM_CATEGORIA };
    atual.valor += Number(t.valor);
    mapa.set(nome, atual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.valor - a.valor);
}

function evolucaoPorCategoria(ultimosMeses, tipo, corPorCategoria) {
  const nomesCategorias = new Set();
  const evolucao = ultimosMeses.map((m) => {
    const linha = { mes: m.mes.slice(0, 7) };
    for (const t of m.transacoes_mes) {
      if (t.tipo !== tipo || !ORIGENS_REAIS.includes(t.origem)) continue;
      const nome = nomeCategoria(t);
      nomesCategorias.add(nome);
      linha[nome] = (linha[nome] || 0) + Number(t.valor);
    }
    return linha;
  });
  const categoriasUsadas = Array.from(nomesCategorias).map(nome => {
    const exemplo = ultimosMeses.flatMap(m => m.transacoes_mes).find(t => t.tipo === tipo && nomeCategoria(t) === nome);
    return { nome, cor: exemplo?.id_categoria ? corPorCategoria.get(exemplo.id_categoria) : COR_SEM_CATEGORIA };
  });
  return { evolucao, categoriasUsadas };
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

  // cores atribuídas por tipo, cada um começando na 1ª cor da paleta
  const corPorCategoria = new Map();
  categorias.filter(c => c.tipo === "saida").forEach((c, i) => corPorCategoria.set(c.id_categoria, CORES_CATEGORIA[i % CORES_CATEGORIA.length]));
  categorias.filter(c => c.tipo === "entrada").forEach((c, i) => corPorCategoria.set(c.id_categoria, CORES_CATEGORIA[i % CORES_CATEGORIA.length]));

  const mesAtualRow = meses.find(m => m.mes.slice(0, 7) === mesYYYYMM);
  const gastoPorCategoriaMes = porCategoriaNoMes(mesAtualRow, "saida", corPorCategoria);
  const entradaPorCategoriaMes = porCategoriaNoMes(mesAtualRow, "entrada", corPorCategoria);

  // lançamentos individuais do mês (reais), pra drill-down por categoria no clique
  const itensDoMes = (mesAtualRow?.transacoes_mes || [])
    .filter(t => ORIGENS_REAIS.includes(t.origem))
    .map(t => ({
      nome: t.nome,
      valor: Number(t.valor),
      tipo: t.tipo,
      categoria: nomeCategoria(t),
      data: t.criado_em ? new Date(t.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "",
    }));

  const ultimosMeses = meses.slice(-6);
  const { evolucao: evolucaoMensal, categoriasUsadas: categoriasEvolucao } = evolucaoPorCategoria(ultimosMeses, "saida", corPorCategoria);
  const { evolucao: evolucaoMensalEntrada, categoriasUsadas: categoriasEvolucaoEntrada } = evolucaoPorCategoria(ultimosMeses, "entrada", corPorCategoria);

  // entradas vs saídas reais, todos os meses
  const entradasSaidasTempo = meses.map((m) => {
    const entradas = m.transacoes_mes
      .filter(t => t.tipo === "entrada" && !ORIGENS_NAO_REAIS_FLUXO.includes(t.origem))
      .reduce((s, t) => s + Number(t.valor), 0);
    const saidas = m.transacoes_mes
      .filter(t => t.tipo === "saida" && !ORIGENS_NAO_REAIS_FLUXO.includes(t.origem))
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
      <p className="sub">Fluxo de entradas e gastos por categoria e visão geral financeira.</p>

      <RelatoriosGraficos
        mesYYYYMM={mesYYYYMM}
        mesAnterior={mesAnterior}
        mesSeguinte={mesSeguinte}
        gastoPorCategoriaMes={gastoPorCategoriaMes}
        entradaPorCategoriaMes={entradaPorCategoriaMes}
        evolucaoMensal={evolucaoMensal}
        categoriasEvolucao={categoriasEvolucao}
        evolucaoMensalEntrada={evolucaoMensalEntrada}
        categoriasEvolucaoEntrada={categoriasEvolucaoEntrada}
        entradasSaidasTempo={entradasSaidasTempo}
        metasInvestimentos={metasInvestimentos}
        itensDoMes={itensDoMes}
      />
    </div>
  );
}
