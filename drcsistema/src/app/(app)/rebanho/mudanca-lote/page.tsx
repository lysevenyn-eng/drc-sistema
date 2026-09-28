import { eq, and, isNotNull } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { animals, lots, lotTransfers } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { transferLotAction, deleteLotTransferAction } from "@/app/actions/rebanho";
import { ConfirmForm } from "@/components/confirm-form";
import { MudancaLoteForm } from "@/components/mudanca-lote-form";

export default async function MudancaLotePage({
  searchParams,
}: {
  searchParams: Promise<{ fromLotId?: string }>;
}) {
  const session = await requireSession();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;
  const isAdmin = session.role === "admin";
  const { fromLotId } = await searchParams;

  const [activeLots, lottedAnimals, transferRows] = await Promise.all([
    db.query.lots.findMany({
      where: and(eq(lots.farmId, farmId), eq(lots.status, "ativo")),
      orderBy: (l, { asc }) => [asc(l.name)],
    }),
    db.query.animals.findMany({
      where: and(eq(animals.farmId, farmId), eq(animals.status, "ativo"), isNotNull(animals.lotId)),
      with: { lot: true },
      orderBy: (a, { asc }) => [asc(a.tag)],
    }),
    db.query.lotTransfers.findMany({
      where: eq(lotTransfers.farmId, farmId),
      with: { animal: true, fromLot: true, toLot: true },
      orderBy: (t, { desc }) => [desc(t.eventDate)],
      limit: 25,
    }),
  ]);

  const lotOptions = activeLots.map((l) => ({ id: l.id, name: l.name, quantity: l.quantity }));
  const animalOptions = lottedAnimals
    .filter((a) => a.lot)
    .map((a) => ({ id: a.id, tag: a.tag, name: a.name, lotId: a.lot!.id, lotName: a.lot!.name }));

  return (
    <div>
      <PageHeader
        title="Mudança de lote"
        description="Realoque cabeças (ou um animal específico) de um lote pra outro — ex.: separar confinamentos a partir de um lote maior"
      />

      <Card className="max-w-3xl p-5">
        <MudancaLoteForm
          animals={animalOptions}
          lots={lotOptions}
          action={transferLotAction}
          presetFromLotId={fromLotId}
        />
      </Card>

      <h2 className="mb-2 mt-8 text-sm font-semibold text-drc-green-950">
        Últimas mudanças {transferRows.length > 0 && `(${transferRows.length})`}
      </h2>
      <Card className="divide-y divide-drc-border/60">
        {transferRows.length === 0 ? (
          <EmptyState>Nenhuma mudança de lote registrada ainda.</EmptyState>
        ) : (
          transferRows.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="font-medium text-drc-green-950">
                  {t.animal
                    ? `${t.animal.tag}${t.animal.name ? ` — ${t.animal.name}` : ""}`
                    : `${t.quantity} cabeça${t.quantity === 1 ? "" : "s"}`}
                  <span className="mx-2 text-drc-green-900/40">·</span>
                  {t.fromLot?.name ?? "lote excluído"}
                  <span className="mx-1 text-drc-green-900/50">→</span>
                  {t.toLot?.name ?? "lote excluído"}
                </p>
                <p className="mt-1 text-xs text-drc-green-900/60">
                  {new Date(t.eventDate).toLocaleDateString("pt-BR")}
                  {t.notes ? ` · ${t.notes}` : ""}
                </p>
              </div>
              {isAdmin && (
                <ConfirmForm
                  action={deleteLotTransferAction}
                  confirmMessage="Desfazer esta mudança de lote? A quantidade volta pro lote de origem."
                >
                  <input type="hidden" name="eventId" value={t.id} />
                  <button type="submit" className="text-xs font-medium text-red-600 underline underline-offset-2">
                    Desfazer
                  </button>
                </ConfirmForm>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
