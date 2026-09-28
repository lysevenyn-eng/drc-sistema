import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { purchases, breeds } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { updatePurchaseAction } from "@/app/actions/compras-vendas";
import { formatCurrency } from "@/lib/money";

const inputClass =
  "w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50";

const COMPOSITION_LABEL: Record<string, string> = {
  macho: "Macho",
  femea: "Fêmea",
  misto: "Misto",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-drc-green-900">{label}</label>
      {children}
    </div>
  );
}

export default async function EditarCompraPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const { id } = await params;
  const farmId = session.farmId;

  const [purchase, farmBreeds] = await Promise.all([
    db.query.purchases.findFirst({
      where: and(eq(purchases.id, id), eq(purchases.farmId, farmId)),
      with: { lot: true, animal: true },
    }),
    db.query.breeds.findMany({ where: eq(breeds.farmId, farmId), orderBy: (b, { asc }) => [asc(b.name)] }),
  ]);
  if (!purchase) {
    return <EmptyState>Compra não encontrada.</EmptyState>;
  }

  const isIndividual = !!purchase.animalId;
  const title = isIndividual
    ? `${purchase.animal?.tag ?? "—"}${purchase.animal?.name ? ` — ${purchase.animal.name}` : ""}`
    : `Lote: ${purchase.lot?.name ?? "—"} (${purchase.quantity} cabeça${purchase.quantity === 1 ? "" : "s"})`;
  const purchaseDateStr = new Date(purchase.purchaseDate).toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Editar compra" description={title} showBack />
      {!isIndividual && (
        <p className="mb-4 text-xs text-drc-green-900/60">
          Quantidade, valor total e peso total não dá pra mudar aqui — eles já entraram na média
          ponderada de custo/peso do lote (ver Rebanho), e desfazer isso com exatidão depois de
          outras compras/vendas no meio do caminho deixaria de ser confiável. Pra corrigir esses
          três campos, exclua esta compra e lance de novo.
        </p>
      )}
      <Card className="max-w-xl p-5">
        <form action={updatePurchaseAction} className="space-y-4">
          <input type="hidden" name="purchaseId" value={purchase.id} />

          {isIndividual ? (
            <Field label="Valor pago (R$)">
              <input
                name="totalValue"
                type="number"
                min={0}
                step="0.01"
                defaultValue={purchase.totalValue}
                className={inputClass}
              />
            </Field>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-sm text-drc-green-900/70">
              <div>
                <p className="text-xs uppercase tracking-wide text-drc-green-900/50">Quantidade</p>
                <p className="mt-0.5 font-medium text-drc-green-950">{purchase.quantity}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-drc-green-900/50">Valor total</p>
                <p className="mt-0.5 font-medium text-drc-green-950">{formatCurrency(purchase.totalValue)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-drc-green-900/50">Composição</p>
                <select name="composition" defaultValue={purchase.composition} className={inputClass}>
                  {Object.entries(COMPOSITION_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Fornecedor (opcional)">
              <input name="supplierName" defaultValue={purchase.supplierName ?? ""} className={inputClass} />
            </Field>
            <Field label="Raça (opcional)">
              <select name="breedId" defaultValue={purchase.breedId ?? ""} className={inputClass}>
                <option value="">Selecione a raça</option>
                {farmBreeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Data da compra">
            <input name="purchaseDate" type="date" required defaultValue={purchaseDateStr} className={inputClass} />
          </Field>

          <Field label="Descrição (opcional)">
            <textarea name="description" rows={2} defaultValue={purchase.description ?? ""} className={inputClass} />
          </Field>

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
