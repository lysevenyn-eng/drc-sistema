import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { sales } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { updateSaleAction } from "@/app/actions/compras-vendas";
import { formatCurrency } from "@/lib/money";

const inputClass =
  "w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50";

const SALE_MODE_LABELS: Record<string, string> = {
  vivo_cabeca: "Vivo — por cabeça",
  vivo_peso: "Vivo — por peso",
  carcaca: "Carcaça",
  outra: "Outra",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-drc-green-900">{label}</label>
      {children}
    </div>
  );
}

export default async function EditarVendaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const { id } = await params;

  const sale = await db.query.sales.findFirst({
    where: and(eq(sales.id, id), eq(sales.farmId, session.farmId)),
    with: { lot: true, animal: true },
  });
  if (!sale) {
    return <EmptyState>Venda não encontrada.</EmptyState>;
  }

  const title =
    sale.saleType === "lote"
      ? `Lote: ${sale.lot?.name ?? "—"} (${sale.quantity} cabeça${sale.quantity === 1 ? "" : "s"})`
      : `${sale.animal?.tag ?? "—"}${sale.animal?.name ? ` — ${sale.animal.name}` : ""}`;
  const saleDateStr = new Date(sale.saleDate).toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Editar venda" description={title} showBack />
      <p className="mb-4 text-xs text-drc-green-900/60">
        Tipo, lote/animal e quantidade não dá pra mudar aqui — eles já deram baixa no rebanho na
        hora da venda. Pra corrigir isso, exclua esta venda em Compras e vendas e lance de novo.
        {sale.costBasis != null && (
          <> Custo registrado: {formatCurrency(sale.costBasis)} (não muda com esta edição).</>
        )}
      </p>
      <Card className="max-w-xl p-5">
        <form action={updateSaleAction} className="space-y-4">
          <input type="hidden" name="saleId" value={sale.id} />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Modo da venda">
              <select name="saleMode" required defaultValue={sale.saleMode} className={inputClass}>
                {Object.entries(SALE_MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Valor total (R$)">
              <input
                name="totalValue"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={sale.totalValue}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Peso vivo (kg, opcional)">
              <input
                name="liveWeightKg"
                type="number"
                min={0}
                step="0.001"
                defaultValue={sale.liveWeightKg ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Peso da carcaça (kg, opcional)">
              <input
                name="carcassWeightKg"
                type="number"
                min={0}
                step="0.001"
                defaultValue={sale.carcassWeightKg ?? ""}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Data da venda">
              <input name="saleDate" type="date" required defaultValue={saleDateStr} className={inputClass} />
            </Field>
            <Field label="Comprador (opcional)">
              <input name="buyer" defaultValue={sale.buyer ?? ""} className={inputClass} />
            </Field>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            Salvar alterações
          </button>
        </form>
      </Card>
    </div>
  );
}
