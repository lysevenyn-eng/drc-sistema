import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { abateEvents } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { updateAbateEventAction } from "@/app/actions/rebanho";

const inputClass =
  "w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-drc-green-900">{label}</label>
      {children}
    </div>
  );
}

export default async function EditarAbatePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const { id } = await params;
  const isAdmin = session.role === "admin";

  const event = await db.query.abateEvents.findFirst({
    where: and(eq(abateEvents.id, id), eq(abateEvents.farmId, session.farmId)),
    with: { animal: true, lot: true },
  });
  if (!event) {
    return <EmptyState>Abate não encontrado.</EmptyState>;
  }

  const isLote = !event.animalId;
  const resolved = !!event.saleId || !!event.resolvedAt;
  const title = event.animal
    ? `${event.animal.tag}${event.animal.name ? ` — ${event.animal.name}` : ""}`
    : `Lote: ${event.lot?.name ?? "—"}`;
  const eventDateStr = new Date(event.eventDate).toISOString().slice(0, 10);

  if (resolved && !isAdmin) {
    return (
      <div>
        <PageHeader title="Editar abate" description={title} showBack />
        <EmptyState>
          Esse abate já foi resolvido (venda vinculada) — só um administrador pode editar depois
          disso.
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Editar abate" description={title} showBack />
      <Card className="max-w-xl p-5">
        <form action={updateAbateEventAction} className="space-y-4">
          <input type="hidden" name="eventId" value={event.id} />

          {isLote && (
            <Field label="Quantidade">
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={event.quantity}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-drc-green-900/50">
                Mudar aqui ajusta o saldo do lote pela diferença. Se o lote não tiver saldo pra
                cobrir um aumento, a mudança de quantidade é ignorada (o resto da edição segue
                normal).
              </p>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label={`Peso da carcaça${isLote ? " total" : ""} (kg, opcional)`}>
              <input
                name="carcassWeightKg"
                type="number"
                min={0}
                step="0.001"
                defaultValue={event.carcassWeightKg ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label={`Peso vivo${isLote ? " total" : ""} antes do abate (kg, opcional)`}>
              <input
                name="liveWeightKg"
                type="number"
                min={0}
                step="0.001"
                defaultValue={event.liveWeightKg ?? ""}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Data do abate">
            <input name="eventDate" type="date" defaultValue={eventDateStr} className={inputClass} />
          </Field>

          <Field label="Observações (opcional)">
            <textarea name="notes" rows={2} defaultValue={event.notes ?? ""} className={inputClass} />
          </Field>

          {resolved && (
            <p className="text-xs text-drc-green-900/50">
              Esse abate já foi resolvido — editar aqui não muda a venda já lançada em Compras e
              vendas, só o próprio registro do abate.
            </p>
          )}

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
