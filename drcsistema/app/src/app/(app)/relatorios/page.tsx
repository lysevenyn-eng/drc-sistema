import { and, eq, isNull, gte, sql } from "drizzle-orm";
import { subMonths, startOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { reproductionEvents, mortalityEvents, sales, animals, lots } from "@/db/schema";
import { PageHeader, Card, StatCard, Badge, EmptyState } from "@/components/ui";
import { BarChart } from "@/components/bar-chart";
import { closeCoberturaAction, reopenCoberturaAction } from "@/app/actions/reproducao";
import { classifyCoberturas, type CoberturaStatus } from "@/lib/reproducao-relatorio";
import { formatCurrency } from "@/lib/money";

const STATUS_LABEL: Record<CoberturaStatus, string> = {
  aguardando: "Aguardando resultado",
  nao_emprenhou: "Não emprenhou",
  emprenhou: "Emprenhou",
  emprenhou_gemelar: "Emprenhou (gemelar)",
  obito: "Óbito da matriz",
  encerrada: "Encerrada sem resultado",
};

const STATUS_TONE: Record<CoberturaStatus, "neutral" | "green" | "gold" | "red"> = {
  aguardando: "neutral",
  nao_emprenhou: "red",
  emprenhou: "green",
  emprenhou_gemelar: "gold",
  obito: "red",
  encerrada: "neutral",
};

const MONTHS_WINDOW = 6;

function lastMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => startOfMonth(subMonths(now, n - 1 - i)));
}

function monthKey(d: Date) {
  return format(d, "yyyy-MM");
}

function monthLabel(d: Date) {
  const s = format(d, "MMM/yy", { locale: ptBR });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function RelatoriosPage() {
  const session = await requireSession();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;
  const isAdmin = session.role === "admin";

  const months = lastMonths(MONTHS_WINDOW);
  const windowStart = months[0];

  const [events, mortEvents, individualCountRow, lotAggRow, saleRows] = await Promise.all([
    db.query.reproductionEvents.findMany({
      where: eq(reproductionEvents.farmId, farmId),
      with: { mother: true, father: true },
    }),
    db.query.mortalityEvents.findMany({
      where: eq(mortalityEvents.farmId, farmId),
      columns: { quantity: true, eventDate: true },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(animals)
      .where(and(eq(animals.farmId, farmId), eq(animals.status, "ativo"), isNull(animals.lotId))),
    db
      .select({ headcount: sql<number>`coalesce(sum(${lots.quantity}), 0)::int` })
      .from(lots)
      .where(and(eq(lots.farmId, farmId), eq(lots.status, "ativo"))),
    isAdmin
      ? db.query.sales.findMany({
          where: and(eq(sales.farmId, farmId), gte(sales.saleDate, windowStart)),
          columns: {
            totalValue: true,
            saleDate: true,
            saleMode: true,
            liveWeightKg: true,
            carcassWeightKg: true,
          },
        })
      : Promise.resolve([]),
  ]);

  // ---------- Reprodução ----------
  const coberturas = classifyCoberturas(events);
  const counts = coberturas.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<CoberturaStatus, number>
  );
  const aguardando = counts.aguardando ?? 0;
  const naoEmprenhou = counts.nao_emprenhou ?? 0;
  const emprenhouGemelar = counts.emprenhou_gemelar ?? 0;
  const emprenhouTotal = (counts.emprenhou ?? 0) + emprenhouGemelar;
  const obitoMatriz = counts.obito ?? 0;
  const encerradaManual = counts.encerrada ?? 0;
  const encerradasTotal = obitoMatriz + encerradaManual;

  // ---------- Mortalidade ----------
  const mortByMonth = new Map<string, number>();
  for (const m of mortEvents) {
    const key = monthKey(new Date(m.eventDate));
    mortByMonth.set(key, (mortByMonth.get(key) ?? 0) + m.quantity);
  }
  const mortalityChartData = months.map((m) => ({
    label: monthLabel(m),
    value: mortByMonth.get(monthKey(m)) ?? 0,
  }));
  const totalDeaths = mortEvents.reduce((sum, m) => sum + m.quantity, 0);
  const currentHeadcount = (individualCountRow[0]?.count ?? 0) + (lotAggRow[0]?.headcount ?? 0);
  const mortalityRate =
    totalDeaths + currentHeadcount > 0 ? (totalDeaths / (totalDeaths + currentHeadcount)) * 100 : null;

  // ---------- Vendas e rendimento de carcaça (admin) ----------
  const salesByMonth = new Map<string, number>();
  const carcacaByMonth = new Map<string, { sum: number; count: number }>();
  for (const s of saleRows) {
    const key = monthKey(new Date(s.saleDate));
    salesByMonth.set(key, (salesByMonth.get(key) ?? 0) + s.totalValue);

    if (s.saleMode === "carcaca" && s.liveWeightKg != null && s.carcassWeightKg != null && s.liveWeightKg > 0) {
      const rendimento = (s.carcassWeightKg / s.liveWeightKg) * 100;
      const cur = carcacaByMonth.get(key) ?? { sum: 0, count: 0 };
      cur.sum += rendimento;
      cur.count += 1;
      carcacaByMonth.set(key, cur);
    }
  }
  const salesChartData = months.map((m) => ({
    label: monthLabel(m),
    value: salesByMonth.get(monthKey(m)) ?? 0,
  }));
  const carcacaChartData = months.map((m) => {
    const cur = carcacaByMonth.get(monthKey(m));
    return { label: monthLabel(m), value: cur ? cur.sum / cur.count : 0 };
  });

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Reprodução, mortalidade e desempenho comercial do rebanho"
      />

      {/* ---------- Reprodução ---------- */}
      <h2 className="mb-2 text-sm font-semibold text-drc-green-950">Reprodução</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Aguardando resultado" value={aguardando} />
        <StatCard
          label="Emprenhou"
          value={emprenhouTotal}
          hint={emprenhouGemelar > 0 ? `${emprenhouGemelar} gemelar` : undefined}
        />
        <StatCard label="Não emprenhou" value={naoEmprenhou} />
        <StatCard
          label="Encerradas / óbito"
          value={encerradasTotal}
          hint={obitoMatriz > 0 ? `${obitoMatriz} óbito da matriz` : undefined}
        />
      </div>

      <Card className="mt-3 overflow-x-auto">
        {coberturas.length === 0 ? (
          <EmptyState>Nenhuma cobertura registrada ainda.</EmptyState>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                <th className="px-4 py-2.5">Cobertura</th>
                <th className="px-4 py-2.5">Matriz</th>
                <th className="px-4 py-2.5">Pai</th>
                <th className="px-4 py-2.5">Previsão de parto</th>
                <th className="px-4 py-2.5">Resultado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {coberturas.map((c) => (
                <tr key={c.eventId} className="border-b border-drc-border/60 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-drc-green-900/80">
                    {c.eventDate.toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    {c.motherTag}
                    {c.motherName ? ` — ${c.motherName}` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">{c.fatherTag ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-drc-green-900/80">
                    {c.previsaoParto.toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {c.status === "aguardando" && (
                      <form action={closeCoberturaAction}>
                        <input type="hidden" name="eventId" value={c.eventId} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                        >
                          Encerrar sem resultado
                        </button>
                      </form>
                    )}
                    {c.status === "encerrada" && (
                      <form action={reopenCoberturaAction}>
                        <input type="hidden" name="eventId" value={c.eventId} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                        >
                          Reabrir
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ---------- Mortalidade ---------- */}
      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-drc-green-950">Mortalidade</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Óbitos (total)" value={totalDeaths} />
          <StatCard
            label="Taxa de mortalidade"
            value={mortalityRate != null ? `${mortalityRate.toFixed(1)}%` : "—"}
            hint="Óbitos ÷ (óbitos + rebanho atual)"
          />
          <StatCard label="Rebanho atual" value={currentHeadcount} hint="Sem lote + em lotes ativos" />
        </div>
        <Card className="mt-3 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-drc-green-900/60">
            Óbitos por mês
          </p>
          <BarChart data={mortalityChartData} emptyLabel="Nenhum óbito registrado nos últimos 6 meses." />
        </Card>
      </div>

      {/* ---------- Vendas (admin) ---------- */}
      {isAdmin && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-drc-green-950">Vendas</h2>
          <Card className="p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-drc-green-900/60">
              Faturamento por mês
            </p>
            <BarChart
              data={salesChartData}
              formatValue={formatCurrency}
              emptyLabel="Nenhuma venda registrada nos últimos 6 meses."
            />
          </Card>
        </div>
      )}

      {/* ---------- Rendimento de carcaça (admin) ---------- */}
      {isAdmin && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-drc-green-950">Rendimento de carcaça</h2>
          <Card className="p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-drc-green-900/60">
              Rendimento médio por mês (vendas em modo carcaça, com os dois pesos preenchidos)
            </p>
            <BarChart
              data={carcacaChartData}
              formatValue={(v) => `${v.toFixed(1)}%`}
              emptyLabel="Nenhuma venda em modo carcaça com pesos registrados nos últimos 6 meses."
            />
          </Card>
        </div>
      )}
    </div>
  );
}
