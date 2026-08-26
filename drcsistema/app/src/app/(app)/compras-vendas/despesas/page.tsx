import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { deleteExpenseAction } from "@/app/actions/compras-vendas";
import { ConfirmForm } from "@/components/confirm-form";
import { formatCurrency } from "@/lib/money";
import { ComprasVendasTabs } from "@/components/compras-vendas-tabs";

const CATEGORY_LABEL: Record<string, string> = {
  medicamento_vacina: "Medicamento/vacina",
  inseminacao: "Inseminação",
  gta: "GTA/documentação",
  alimentacao: "Alimentação",
  frete: "Frete",
  outras: "Outras",
};

export default async function DespesasPage() {
  const session = await requireAdmin();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;

  const expenseList = await db.query.expenses.findMany({
    where: eq(expenses.farmId, farmId),
    with: { lot: true, animal: true },
    orderBy: (e, { desc }) => [desc(e.date)],
  });
  const total = expenseList.reduce((sum, e) => sum + e.value, 0);

  return (
    <div>
      <PageHeader
        title="Compras e vendas"
        description="Compra por lote, despesas por categoria e vendas com cálculo de lucro"
        action={
          <Link
            href="/compras-vendas/despesas/novo"
            className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            + Nova despesa
          </Link>
        }
      />

      <ComprasVendasTabs active="despesas" />

      {expenseList.length > 0 && (
        <p className="mb-3 text-sm text-drc-green-900/70">
          Total registrado: <span className="font-semibold text-drc-green-950">{formatCurrency(total)}</span>
        </p>
      )}

      <Card className="overflow-x-auto">
        {expenseList.length === 0 ? (
          <EmptyState>Nenhuma despesa registrada ainda.</EmptyState>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Categoria</th>
                <th className="px-4 py-2.5">Vinculado a</th>
                <th className="px-4 py-2.5">Valor</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {expenseList.map((e) => (
                <tr key={e.id} className="border-b border-drc-border/60 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-drc-green-900/80">
                    {new Date(e.date).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-drc-green-950">
                    {CATEGORY_LABEL[e.category] ?? e.category}
                    {e.description && (
                      <p className="mt-0.5 text-xs font-normal text-drc-green-900/50">{e.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    {e.lot ? (
                      <Link href="/rebanho" className="underline underline-offset-2">
                        {e.lot.name}
                      </Link>
                    ) : e.animal ? (
                      <Link href={`/rebanho/animais/${e.animal.id}`} className="underline underline-offset-2">
                        {e.animal.tag}
                        {e.animal.name ? ` — ${e.animal.name}` : ""}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">{formatCurrency(e.value)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <ConfirmForm
                      action={deleteExpenseAction}
                      confirmMessage="Excluir esta despesa? Esta ação não pode ser desfeita."
                    >
                      <input type="hidden" name="expenseId" value={e.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 underline underline-offset-2"
                      >
                        Excluir
                      </button>
                    </ConfirmForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
