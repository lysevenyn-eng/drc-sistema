import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { purchases } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { deletePurchaseAction } from "@/app/actions/compras-vendas";
import { ConfirmForm } from "@/components/confirm-form";
import { formatCurrency } from "@/lib/money";
import { ComprasVendasTabs } from "@/components/compras-vendas-tabs";

const COMPOSITION_LABEL: Record<string, string> = {
  macho: "Macho",
  femea: "Fêmea",
  misto: "Misto",
};

export default async function ComprasPage() {
  const session = await requireAdmin();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;

  const purchaseList = await db.query.purchases.findMany({
    where: eq(purchases.farmId, farmId),
    with: { lot: true, breed: true, animal: true },
    orderBy: (p, { desc }) => [desc(p.purchaseDate)],
  });

  return (
    <div>
      <PageHeader
        title="Compras e vendas"
        description="Compra por lote, despesas por categoria e vendas com cálculo de lucro"
        action={
          <Link
            href="/compras-vendas/novo"
            className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            + Nova compra
          </Link>
        }
      />

      <ComprasVendasTabs active="compras" />

      <Card className="overflow-x-auto">
        {purchaseList.length === 0 ? (
          <EmptyState>Nenhuma compra registrada ainda.</EmptyState>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Lote / animal</th>
                <th className="px-4 py-2.5">Qtd</th>
                <th className="px-4 py-2.5">Raça / composição</th>
                <th className="px-4 py-2.5">Valor total</th>
                <th className="px-4 py-2.5">Custo unitário</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {purchaseList.map((p) => (
                <tr key={p.id} className="border-b border-drc-border/60 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-drc-green-900/80">
                    {new Date(p.purchaseDate).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    {p.animal ? (
                      <Link href={`/rebanho/animais/${p.animal.id}`} className="underline underline-offset-2">
                        {p.animal.tag}
                        {p.animal.name ? ` — ${p.animal.name}` : ""}
                      </Link>
                    ) : p.lot ? (
                      <Link href="/rebanho" className="underline underline-offset-2">
                        {p.lot.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {p.description && (
                      <p className="mt-0.5 text-xs text-drc-green-900/50">{p.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-drc-green-950">
                    {p.animal ? "1 (individual)" : p.quantity}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    {p.breed?.name ?? "—"} · {COMPOSITION_LABEL[p.composition] ?? p.composition}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">{formatCurrency(p.totalValue)}</td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    {formatCurrency(p.totalValue / p.quantity)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ConfirmForm
                      action={deletePurchaseAction}
                      confirmMessage={
                        p.animal
                          ? `Excluir esta compra? O animal "${p.animal.tag}" continua cadastrado no Rebanho, só o valor pago registrado nele volta a branco${p.lot ? ` e a quantidade do lote "${p.lot.name}" é subtraída em 1` : ""}. Esta ação não pode ser desfeita.`
                          : `Excluir esta compra? A quantidade que ela somou ao lote "${p.lot?.name ?? "—"}" será subtraída de volta. O custo por cabeça do lote não é ajustado automaticamente. Esta ação não pode ser desfeita.`
                      }
                    >
                      <input type="hidden" name="purchaseId" value={p.id} />
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
