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

export default function RelatoriosGraficos({
  mesYYYYMM, mesAnterior, mesSeguinte,
  gastoPorCategoriaMes, evolucaoMensal, categoriasEvolucao,
  entradasSaidasTempo, metasInvestimentos,
}) {
  const totalMes = gastoPorCategoriaMes.reduce((s, c) => s + c.valor, 0);

  return (
    <>
      <section>
        <h2>Gasto por categoria</h2>
        <div className="month-nav">
          <a href={`/relatorios?mes=${mesAnterior}`}>&larr;</a>
          <span className="month-label">{mesYYYYMM}</span>
          <a href={`/relatorios?mes=${mesSeguinte}`}>&rarr;</a>
        </div>
        {gastoPorCategoriaMes.length === 0 ? (
          <div className="empty">Nenhum gasto categorizado neste mês.</div>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={gastoPorCategoriaMes}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  label={({ nome, valor }) => `${nome} ${Math.round((valor / totalMes) * 100)}%`}
                  labelLine={false}
                >
                  {gastoPorCategoriaMes.map((c, i) => (
                    <Cell key={i} fill={c.cor} stroke="var(--paper)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipCard />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section>
        <h2>Evolução mensal por categoria <small>(últimos 6 meses)</small></h2>
        {evolucaoMensal.length === 0 ? (
          <div className="empty">Sem dados suficientes.</div>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={evolucaoMensal}>
                <CartesianGrid stroke={GRID_COR} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={EIXO_ESTILO} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                <YAxis tick={EIXO_ESTILO} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<TooltipCard />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {categoriasEvolucao.map((c) => (
                  <Bar key={c.nome} dataKey={c.nome} stackId="cat" fill={c.cor} radius={0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
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
