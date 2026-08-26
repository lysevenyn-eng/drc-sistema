import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { sales } from "@/db/schema";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { deleteSaleAction } from "@/app/actions/compras-vendas";
import { ConfirmForm } from "@/components/confirm-form";
import { formatCurrency } from "@/lib/money";
import { ComprasVendasTabs } from "@/components/compras-vendas-tabs";

const SALE_MODE_LABEL: Record<string, string> = {
  vivo_cabeca: "Vivo — por cabeça",
  vivo_peso: "Vivo — por peso",
  carcaca: "Carcaça",
  outra: "Outra",
};

export default async function VendasPage() {
  const session = await requireAdmin();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;

  const saleList = await db.query.sales.findMany({
    where: eq(sales.farmId, farmId),
    with: { lot: true, animal: true },
    orderBy: (s, { desc }) => [desc(s.saleDate)],
  });
  const totalRevenue = saleList.reduce((sum, s) => sum + s.totalValue, 0);
  const totalProfit = saleList.reduce((sum, s) => sum + (s.profit ?? 0), 0);
  const hasAnyProfit = saleList.some((s) => s.profit != null);

  return (
    <div>
      <PageHeader
        title="Compras e vendas"
        description="Compra por lote, despesas por categoria e vendas com cálculo de lucro"
        action={
          <Link
            href="/compras-vendas/vendas/novo"
            className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            + Nova venda
          </Link>
        }
      />

      <ComprasVendasTabs active="vendas" />

      {saleList.length > 0 && (
        <p className="mb-3 text-sm text-drc-green-900/70">
          Total vendido: <span className="font-semibold text-drc-green-950">{formatCurrency(totalRevenue)}</span>
          {hasAnyProfit && (
            <>
              {" "}
              · Lucro (onde há custo registrado):{" "}
              <span className="font-semibold text-drc-green-950">{formatCurrency(totalProfit)}</span>
            </>
          )}
        </p>
      )}

      <Card className="overflow-x-auto">
        {saleList.length === 0 ? (
          <EmptyState>Nenhuma venda registrada ainda.</EmptyState>
        ) : (
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Lote / animal</th>
                <th className="px-4 py-2.5">Qtd</th>
                <th className="px-4 py-2.5">Modo</th>
                <th className="px-4 py-2.5">Valor</th>
                <th className="px-4 py-2.5">Lucro</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {saleList.map((s) => (
                <tr key={s.id} className="border-b border-drc-border/60 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-drc-green-900/80">
                    {new Date(s.saleDate).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={s.saleType === "lote" ? "gold" : "green"}>
                      {s.saleType === "lote" ? "Lote" : "Individual"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    {s.saleType === "lote" ? (
                      s.lot ? (
                        <Link href="/rebanho" className="underline underline-offset-2">
                          {s.lot.name}
                        </Link>
                      ) : (
                        "—"
                      )
                    ) : s.animal ? (
                      <Link href={`/rebanho/animais/${s.animal.id}`} className="underline underline-offset-2">
                        {s.animal.tag}
                        {s.animal.name ? ` — ${s.animal.name}` : ""}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {s.buyer && <p className="mt-0.5 text-xs text-drc-green-900/50">Comprador: {s.buyer}</p>}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-drc-green-950">{s.quantity}</td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    {SALE_MODE_LABEL[s.saleMode] ?? s.saleMode}
                    {s.saleMode === "carcaca" && s.liveWeightKg != null && s.carcassWeightKg != null && (
                      <p className="mt-0.5 text-xs text-drc-green-900/50">
                        Rendimento: {((s.carcassWeightKg / s.liveWeightKg) * 100).toFixed(1)}% (
                        {s.liveWeightKg}kg → {s.carcassWeightKg}kg)
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">{formatCurrency(s.totalValue)}</td>
                  <td className="px-4 py-2.5">
                    {s.profit != null ? (
                      <span className={s.profit >= 0 ? "text-drc-green-800" : "text-red-600"}>
                        {formatCurrency(s.profit)}
                      </span>
                    ) : (
                      <span className="text-drc-green-900/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ConfirmForm
                      action={deleteSaleAction}
                      confirmMessage={
                        s.saleType === "lote"
                          ? `Excluir esta venda? A quantidade (${s.quantity}) volta para o lote "${s.lot?.name ?? "—"}". Esta ação não pode ser desfeita.`
                          : "Excluir esta venda? O animal volta para o status Ativo. Esta ação não pode ser desfeita."
                      }
                    >
                      <input type="hidden" name="saleId" value={s.id} />
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
