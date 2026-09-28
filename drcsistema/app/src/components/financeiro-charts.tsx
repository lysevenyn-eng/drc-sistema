"use client";

import { useMemo, useState } from "react";
import type { TooltipContentProps } from "recharts";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, Badge, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/money";

export type MonthChartRow = {
  key: string;
  label: string;
  shortLabel: string;
  receita: number;
  despesas: number;
  resultado: number;
  lucroVendas: number;
};

export type CategoryChartRow = {
  category: string;
  label: string;
  total: number;
  count: number;
};

const PERIODOS = [
  { key: "6m", label: "Últimos 6 meses", months: 6 },
  { key: "12m", label: "Últimos 12 meses", months: 12 },
  { key: "tudo", label: "Tudo", months: Infinity },
] as const;

type PeriodoKey = (typeof PERIODOS)[number]["key"];

// Paleta reaproveitando as cores da identidade visual do DRC (verde/dourado);
// despesa usa vermelho (única cor "de alerta" já usada no resto do sistema,
// ex.: badges de atrasado) pra ficar claro que é o lado negativo da conta.
const CATEGORY_COLORS = ["#1c4f3f", "#f6b412", "#0a2a21", "#fbcb4a", "#123b2f", "#a8763e"];
const COR_RECEITA = "#1c4f3f";
const COR_DESPESAS = "#dc2626";
const COR_RESULTADO = "#f6b412";
const COR_LUCRO = "#0a2a21";

const AXIS_TICK = { fontSize: 11, fill: "#0a2a21" };

function eixoValor(v: number) {
  // Abrevia em "k" só a partir de R$10.000 — abaixo disso, arredondar pra
  // milhar faz ticks vizinhos (ex.: 1.800 e 2.100) caírem no mesmo rótulo
  // "R$2k", o que parece bug mas é só o formatador perdendo precisão.
  if (Math.abs(v) >= 10000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

function CurrencyTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-drc-border bg-white px-3 py-2 text-xs shadow-md">
      {label != null && <p className="mb-1 font-medium text-drc-green-950">{label}</p>}
      {payload.map((p, i) => (
        <p key={`${String(p.dataKey)}-${i}`} style={{ color: p.color }}>
          {p.name}: {formatCurrency(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

/**
 * Gráficos da página Financeiro: evolução ao longo do tempo, despesas por
 * categoria, evolução do resultado/lucro e comparativo entre dois meses.
 * Recebe os dados já calculados no server component (financeiro/page.tsx) —
 * não faz nenhuma conta nova, só filtra/reagrupa pra exibição, pra não correr
 * o risco de um número no gráfico divergir do StatCard/tabela equivalente.
 */
export function FinanceiroCharts({
  monthRows,
  categoryRows,
}: {
  monthRows: MonthChartRow[];
  categoryRows: CategoryChartRow[];
}) {
  const [periodo, setPeriodo] = useState<PeriodoKey>("6m");

  const filtered = useMemo(() => {
    const config = PERIODOS.find((p) => p.key === periodo)!;
    return config.months === Infinity ? monthRows : monthRows.slice(-config.months);
  }, [monthRows, periodo]);

  const ultimosDois = monthRows.slice(-2);
  const [monthAKey, setMonthAKey] = useState(ultimosDois[0]?.key ?? "");
  const [monthBKey, setMonthBKey] = useState(
    ultimosDois[1]?.key ?? monthRows[monthRows.length - 1]?.key ?? ""
  );

  const rowA = monthRows.find((m) => m.key === monthAKey);
  const rowB = monthRows.find((m) => m.key === monthBKey);

  const comparisonData = useMemo(
    () =>
      rowA && rowB
        ? [
            { label: "Receita", A: rowA.receita, B: rowB.receita },
            { label: "Despesas", A: rowA.despesas, B: rowB.despesas },
            { label: "Resultado", A: rowA.resultado, B: rowB.resultado },
          ]
        : [],
    [rowA, rowB]
  );

  function pctChange(a: number, b: number) {
    if (a === 0) return null;
    return ((b - a) / Math.abs(a)) * 100;
  }

  return (
    <div className="mt-6 space-y-4" data-testid="financeiro-charts">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-drc-green-950">Visualizações</h2>
        <div className="flex gap-1 rounded-lg border border-drc-border bg-white p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriodo(p.key)}
              data-testid={`periodo-${p.key}`}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                periodo === p.key
                  ? "bg-drc-green-950 text-white"
                  : "text-drc-green-900/70 hover:bg-drc-green-950/5"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-drc-green-950">
            Evolução financeira (receita, despesas e resultado)
          </h3>
          {filtered.length === 0 ? (
            <EmptyState>Sem lançamentos no período selecionado.</EmptyState>
          ) : (
            <div className="h-72" data-testid="chart-evolucao">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filtered} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd0b0" />
                  <XAxis dataKey="shortLabel" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} tickFormatter={eixoValor} width={50} />
                  <Tooltip content={(props) => <CurrencyTooltip {...props} />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line isAnimationActive={false} type="monotone" dataKey="receita" name="Receita" stroke={COR_RECEITA} strokeWidth={2} dot={{ r: 3 }} />
                  <Line isAnimationActive={false} type="monotone" dataKey="despesas" name="Despesas" stroke={COR_DESPESAS} strokeWidth={2} dot={{ r: 3 }} />
                  <Line isAnimationActive={false} type="monotone" dataKey="resultado" name="Resultado" stroke={COR_RESULTADO} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-drc-green-950">Despesas por categoria</h3>
          {categoryRows.length === 0 ? (
            <EmptyState>Nenhuma despesa registrada ainda.</EmptyState>
          ) : (
            <div className="h-72" data-testid="chart-categorias">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={false} data={categoryRows} dataKey="total" nameKey="label" cx="50%" cy="50%" outerRadius={85}>
                    {categoryRows.map((row, i) => (
                      <Cell key={row.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-drc-green-950">Evolução do lucro por período</h3>
          <p className="mb-3 text-xs text-drc-green-900/50">
            Resultado comercial (receita − despesas) e lucro das vendas (só onde há custo registrado), mês a mês.
          </p>
          {filtered.length === 0 ? (
            <EmptyState>Sem lançamentos no período selecionado.</EmptyState>
          ) : (
            <div className="h-72" data-testid="chart-lucro">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filtered} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd0b0" />
                  <XAxis dataKey="shortLabel" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} tickFormatter={eixoValor} width={50} />
                  <Tooltip content={(props) => <CurrencyTooltip {...props} />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line isAnimationActive={false} type="monotone" dataKey="resultado" name="Resultado comercial" stroke={COR_RESULTADO} strokeWidth={2} dot={{ r: 3 }} />
                  <Line
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="lucroVendas"
                    name="Lucro das vendas"
                    stroke={COR_LUCRO}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-drc-green-950">Comparativo entre meses</h3>
            {rowA && rowB && (
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={monthAKey}
                  onChange={(e) => setMonthAKey(e.target.value)}
                  data-testid="compare-month-a"
                  className="rounded-lg border border-drc-border bg-white px-2 py-1"
                >
                  {monthRows.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <span className="text-drc-green-900/50">vs.</span>
                <select
                  value={monthBKey}
                  onChange={(e) => setMonthBKey(e.target.value)}
                  data-testid="compare-month-b"
                  className="rounded-lg border border-drc-border bg-white px-2 py-1"
                >
                  {monthRows.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {!rowA || !rowB ? (
            <EmptyState>Precisa de pelo menos dois meses com lançamentos pra comparar.</EmptyState>
          ) : (
            <>
              <div className="h-64" data-testid="chart-comparativo">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd0b0" />
                    <XAxis dataKey="label" tick={AXIS_TICK} />
                    <YAxis tick={AXIS_TICK} tickFormatter={eixoValor} width={50} />
                    <Tooltip content={(props) => <CurrencyTooltip {...props} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar isAnimationActive={false} dataKey="A" name={rowA.label} fill="#ece2cd" stroke={COR_RESULTADO} radius={[4, 4, 0, 0]} />
                    <Bar isAnimationActive={false} dataKey="B" name={rowB.label} fill={COR_RESULTADO} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs" data-testid="compare-pct">
                {(
                  [
                    { k: "receita" as const, nome: "Receita", maisEBom: true },
                    { k: "despesas" as const, nome: "Despesas", maisEBom: false },
                    { k: "resultado" as const, nome: "Resultado", maisEBom: true },
                  ]
                ).map(({ k, nome, maisEBom }) => {
                  const change = pctChange(rowA[k], rowB[k]);
                  const isGood = change == null ? null : maisEBom ? change >= 0 : change <= 0;
                  return (
                    <div key={k} className="flex items-center gap-1.5">
                      <span className="text-drc-green-900/60">{nome}:</span>
                      {change == null ? (
                        <span className="text-drc-green-900/40">—</span>
                      ) : (
                        <Badge tone={isGood ? "green" : "red"}>
                          {change >= 0 ? "+" : ""}
                          {change.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
