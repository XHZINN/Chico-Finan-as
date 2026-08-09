"use client";

import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";

function fmt(n) {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

const EIXO_ESTILO = { fontSize: 11, fill: "var(--ink-soft)", fontFamily: "'IBM Plex Mono', monospace" };
const GRID_COR = "var(--line)";

function TooltipCard({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 12px", fontSize: 13 }}>
      {label && <div style={{ fontWeight: 500, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.payload?.cor, display: "flex", gap: 8, justifyContent: "space-between" }}>
          <span>{p.name}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PizzaPorCategoria({ dados, vazioTexto }) {
  const total = dados.reduce((s, c) => s + c.valor, 0);
  if (dados.length === 0) {
    return <div className="empty">{vazioTexto}</div>;
  }
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={dados}
            dataKey="valor"
            nameKey="nome"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            label={({ nome, valor }) => `${nome} ${Math.round((valor / total) * 100)}%`}
            labelLine={false}
          >
            {dados.map((c, i) => (
              <Cell key={i} fill={c.cor} stroke="var(--paper)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<TooltipCard />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function EvolucaoPorCategoria({ dados, categorias, vazioTexto }) {
  if (dados.length === 0) {
    return <div className="empty">{vazioTexto}</div>;
  }
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={dados}>
          <CartesianGrid stroke={GRID_COR} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="mes" tick={EIXO_ESTILO} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
          <YAxis tick={EIXO_ESTILO} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => fmt(v)} />
          <Tooltip content={<TooltipCard />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {categorias.map((c) => (
            <Bar key={c.nome} dataKey={c.nome} stackId="cat" fill={c.cor} radius={0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function RelatoriosGraficos({
  mesYYYYMM, mesAnterior, mesSeguinte,
  gastoPorCategoriaMes, entradaPorCategoriaMes,
  evolucaoMensal, categoriasEvolucao,
  evolucaoMensalEntrada, categoriasEvolucaoEntrada,
  entradasSaidasTempo, metasInvestimentos,
}) {
  return (
    <>
      <section>
        <h2>Gasto por categoria</h2>
        <div className="month-nav">
          <a href={`/relatorios?mes=${mesAnterior}`}>&larr;</a>
          <span className="month-label">{mesYYYYMM}</span>
          <a href={`/relatorios?mes=${mesSeguinte}`}>&rarr;</a>
        </div>
        <PizzaPorCategoria dados={gastoPorCategoriaMes} vazioTexto="Nenhum gasto categorizado neste mês." />
      </section>

      <section>
        <h2>Entrada por categoria</h2>
        <div className="month-nav">
          <a href={`/relatorios?mes=${mesAnterior}`}>&larr;</a>
          <span className="month-label">{mesYYYYMM}</span>
          <a href={`/relatorios?mes=${mesSeguinte}`}>&rarr;</a>
        </div>
        <PizzaPorCategoria dados={entradaPorCategoriaMes} vazioTexto="Nenhuma entrada categorizada neste mês." />
      </section>

      <section>
        <h2>Evolução mensal de gastos por categoria <small>(últimos 6 meses)</small></h2>
        <EvolucaoPorCategoria dados={evolucaoMensal} categorias={categoriasEvolucao} vazioTexto="Sem dados suficientes." />
      </section>

      <section>
        <h2>Evolução mensal de entradas por categoria <small>(últimos 6 meses)</small></h2>
        <EvolucaoPorCategoria dados={evolucaoMensalEntrada} categorias={categoriasEvolucaoEntrada} vazioTexto="Sem dados suficientes." />
      </section>

      <section>
        <h2>Entradas vs saídas ao longo do tempo</h2>
        {entradasSaidasTempo.length === 0 ? (
          <div className="empty">Sem dados suficientes.</div>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={entradasSaidasTempo}>
                <CartesianGrid stroke={GRID_COR} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={EIXO_ESTILO} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                <YAxis tick={EIXO_ESTILO} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<TooltipCard />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke="#1baf7a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="saidas" name="Saídas" stroke="#e34948" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section>
        <h2>Metas e investimentos <small>(valor guardado/aplicado atual)</small></h2>
        {metasInvestimentos.length === 0 ? (
          <div className="empty">Nenhuma meta ou investimento cadastrado.</div>
        ) : (
          <div style={{ width: "100%", height: Math.max(160, metasInvestimentos.length * 44) }}>
            <ResponsiveContainer>
              <BarChart data={metasInvestimentos} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke={GRID_COR} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={EIXO_ESTILO} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                <YAxis type="category" dataKey="nome" tick={EIXO_ESTILO} axisLine={false} tickLine={false} width={160} />
                <Tooltip content={<TooltipCard />} />
                <Bar dataKey="valor" name="Valor" fill="#2a78d6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </>
  );
}
