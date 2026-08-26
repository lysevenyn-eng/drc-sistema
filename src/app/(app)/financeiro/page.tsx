import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { sales, expenses, purchases } from "@/db/schema";
import { PageHeader, StatCard, Card, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/money";

const CATEGORY_LABEL: Record<string, string> = {
  medicamento_vacina: "Medicamento/vacina",
  inseminacao: "Inseminação",
  gta: "GTA/documentação",
  alimentacao: "Alimentação",
  frete: "Frete",
  outras: "Outras",
};

function monthKey(date: Date | string) {
  return format(new Date(date), "yyyy-MM");
}

function monthLabel(key: string) {
  // Tailwind's `capitalize` maiusculiza cada palavra ("Agosto De 2026") — em vez disso,
  // maiusculiza só a primeira letra da string inteira, como se escreve em português.
  const raw = format(new Date(`${key}-01T00:00:00`), "MMMM 'de' yyyy", { locale: ptBR });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default async function FinanceiroPage() {
  const session = await requireAdmin();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;

  const [saleList, expenseList, purchaseList] = await Promise.all([
    db.query.sales.findMany({
      where: eq(sales.farmId, farmId),
      columns: { totalValue: true, profit: true, saleDate: true },
    }),
    db.query.expenses.findMany({
      where: eq(expenses.farmId, farmId),
      columns: { category: true, value: true, date: true },
    }),
    db.query.purchases.findMany({
      where: eq(purchases.farmId, farmId),
      columns: { totalValue: true },
    }),
  ]);

  const totalReceita = saleList.reduce((sum, s) => sum + s.totalValue, 0);
  const totalDespesas = expenseList.reduce((sum, e) => sum + e.value, 0);
  const resultadoComercial = totalReceita - totalDespesas;
  const totalLucroVendas = saleList.reduce((sum, s) => sum + (s.profit ?? 0), 0);
  const totalCompras = purchaseList.reduce((sum, p) => sum + p.totalValue, 0);

  // Despesas por categoria
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const e of expenseList) {
    const entry = byCategory.get(e.category) ?? { total: 0, count: 0 };
    entry.total += e.value;
    entry.count += 1;
    byCategory.set(e.category, entry);
  }
  const categoryRows = Array.from(byCategory.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);

  // Resultado por mês (receita de vendas − despesas), mais recente primeiro.
  const byMonth = new Map<string, { receita: number; despesas: number }>();
  for (const s of saleList) {
    const key = monthKey(s.saleDate);
    const m = byMonth.get(key) ?? { receita: 0, despesas: 0 };
    m.receita += s.totalValue;
    byMonth.set(key, m);
  }
  for (const e of expenseList) {
    const key = monthKey(e.date);
    const m = byMonth.get(key) ?? { receita: 0, despesas: 0 };
    m.despesas += e.value;
    byMonth.set(key, m);
  }
  const monthRows = Array.from(byMonth.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Receitas, despesas e resultado comercial — separado do saldo real disponível na carteira"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Receita (vendas)" value={formatCurrency(totalReceita)} />
        <StatCard label="Despesas" value={formatCurrency(totalDespesas)} />
        <StatCard
          label="Resultado comercial"
          value={formatCurrency(resultadoComercial)}
          hint="Receita − despesas"
        />
        <StatCard
          label="Lucro das vendas"
          value={formatCurrency(totalLucroVendas)}
          hint="Onde há custo registrado"
        />
        <StatCard
          label="Investido em compras"
          value={formatCurrency(totalCompras)}
          hint="Não entra no resultado"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-x-auto p-5">
          <h2 className="mb-3 text-sm font-semibold text-drc-green-950">Despesas por categoria</h2>
          {categoryRows.length === 0 ? (
            <EmptyState>Nenhuma despesa registrada ainda.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                  <th className="py-2">Categoria</th>
                  <th className="py-2">Lançamentos</th>
                  <th className="py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((row) => (
                  <tr key={row.category} className="border-b border-drc-border/60 last:border-0">
                    <td className="py-2 text-drc-green-900/80">
                      {CATEGORY_LABEL[row.category] ?? row.category}
                    </td>
                    <td className="py-2 text-drc-green-900/80">{row.count}</td>
                    <td className="py-2 font-medium text-drc-green-950">{formatCurrency(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="overflow-x-auto p-5">
          <h2 className="mb-3 text-sm font-semibold text-drc-green-950">Resultado por mês</h2>
          {monthRows.length === 0 ? (
            <EmptyState>Sem lançamentos ainda.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                  <th className="py-2">Mês</th>
                  <th className="py-2">Receita</th>
                  <th className="py-2">Despesas</th>
                  <th className="py-2">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((row) => {
                  const resultado = row.receita - row.despesas;
                  return (
                    <tr key={row.key} className="border-b border-drc-border/60 last:border-0">
                      <td className="py-2 text-drc-green-900/80">{monthLabel(row.key)}</td>
                      <td className="py-2 text-drc-green-900/80">{formatCurrency(row.receita)}</td>
                      <td className="py-2 text-drc-green-900/80">{formatCurrency(row.despesas)}</td>
                      <td
                        className={`py-2 font-medium ${
                          resultado >= 0 ? "text-drc-green-800" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(resultado)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
