import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { animals, lots, abateEvents, mortalityEvents } from "@/db/schema";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import {
  registerAbateAction,
  registerDeathAction,
  confirmDeathReasonAction,
  resolveAbateEventAction,
  reopenAbateEventAction,
  deleteLotAbateEventAction,
  deleteLotMortalityEventAction,
  reactivateAnimalAction,
} from "@/app/actions/rebanho";
import { ConfirmForm } from "@/components/confirm-form";
import { AbateObitoForm } from "@/components/abate-obito-form";

const inputClass =
  "w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50";

function eventTitle(ev: {
  animal: { tag: string; name: string | null } | null;
  lot: { name: string } | null;
  quantity: number;
}) {
  if (ev.animal) return `${ev.animal.tag}${ev.animal.name ? ` — ${ev.animal.name}` : ""}`;
  if (ev.lot) return `Lote: ${ev.lot.name} (${ev.quantity} cabeça${ev.quantity === 1 ? "" : "s"})`;
  return "Animal excluído";
}

export default async function AbatesObitosPage() {
  const session = await requireSession();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;
  const isAdmin = session.role === "admin";

  const [activeAnimals, activeLots, abateRows, mortalityRows] = await Promise.all([
    db.query.animals.findMany({
      where: and(eq(animals.farmId, farmId), eq(animals.status, "ativo")),
      with: { lot: true },
      orderBy: (a, { asc }) => [asc(a.tag)],
    }),
    db.query.lots.findMany({
      where: and(eq(lots.farmId, farmId), eq(lots.status, "ativo")),
      orderBy: (l, { asc }) => [asc(l.name)],
    }),
    db.query.abateEvents.findMany({
      where: eq(abateEvents.farmId, farmId),
      with: { animal: true, lot: true },
      orderBy: (e, { desc }) => [desc(e.eventDate)],
      limit: 25,
    }),
    db.query.mortalityEvents.findMany({
      where: eq(mortalityEvents.farmId, farmId),
      with: { animal: true, lot: true },
      orderBy: (e, { desc }) => [desc(e.eventDate)],
      limit: 25,
    }),
  ]);

  const animalOptions = activeAnimals.map((a) => ({
    id: a.id,
    tag: a.tag,
    name: a.name,
    lot: a.lot ? { name: a.lot.name } : null,
  }));
  const lotOptions = activeLots.map((l) => ({ id: l.id, name: l.name, quantity: l.quantity }));

  return (
    <div>
      <PageHeader
        title="Abates e óbitos"
        description="Registre um abate ou óbito, de um animal ou de vários de um lote — a baixa acontece na hora; se você não for admin, fica pendente até a confirmação"
      />

      <Card className="max-w-2xl p-5">
        <AbateObitoForm
          animals={animalOptions}
          lots={lotOptions}
          isAdmin={isAdmin}
          abateAction={registerAbateAction}
          obitoAction={registerDeathAction}
        />
      </Card>

      <h2 className="mb-2 mt-8 text-sm font-semibold text-drc-green-950">
        Abates {abateRows.length > 0 && `(${abateRows.length})`}
      </h2>
      <Card className="divide-y divide-drc-border/60">
        {abateRows.length === 0 ? (
          <EmptyState>Nenhum abate registrado ainda.</EmptyState>
        ) : (
          abateRows.map((ev) => {
            const resolved = !!ev.saleId || !!ev.resolvedAt;
            const isLote = !ev.animalId;
            return (
              <div key={ev.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-drc-green-950">{eventTitle(ev)}</p>
                  <Badge tone={resolved ? "green" : "gold"}>
                    {resolved ? "Vendido" : "Aguardando venda"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-drc-green-900/60">
                  {new Date(ev.eventDate).toLocaleDateString("pt-BR")}
                  {ev.carcassWeightKg != null ? ` · carcaça ${ev.carcassWeightKg} kg` : ""}
                  {ev.liveWeightKg != null ? ` · vivo ${ev.liveWeightKg} kg` : ""}
                </p>
                {ev.notes && <p className="mt-1 text-xs text-drc-green-900/60">{ev.notes}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/abates-obitos/abate/${ev.id}/editar`}
                    className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                  >
                    Editar
                  </Link>
                  {!resolved && !isLote && ev.animalId && (
                    <ConfirmForm
                      action={reactivateAnimalAction}
                      confirmMessage="Desfazer este abate? O animal volta para o status Ativo e o registro de abate é removido. Se ele estava em um lote, a quantidade volta pro lote."
                    >
                      <input type="hidden" name="animalId" value={ev.animalId} />
                      <button type="submit" className="text-xs font-medium text-red-600 underline underline-offset-2">
                        Desfazer
                      </button>
                    </ConfirmForm>
                  )}
                  {isAdmin && !resolved && !isLote && ev.animalId && (
                    <Link
                      href={`/compras-vendas/vendas/novo?animalId=${ev.animalId}`}
                      className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                    >
                      Registrar venda →
                    </Link>
                  )}
                  {isAdmin && !resolved && isLote && ev.lotId && (
                    <Link
                      href={`/compras-vendas/vendas/novo?lotId=${ev.lotId}&quantity=${ev.quantity}&abateEventId=${ev.id}${
                        ev.carcassWeightKg != null ? `&carcassWeightKg=${ev.carcassWeightKg}` : ""
                      }${ev.liveWeightKg != null ? `&liveWeightKg=${ev.liveWeightKg}` : ""}`}
                      className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                    >
                      Ir para nova venda →
                    </Link>
                  )}
                  {isAdmin && !resolved && isLote && (
                    <>
                      <form action={resolveAbateEventAction}>
                        <input type="hidden" name="eventId" value={ev.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-xs font-semibold text-drc-green-950 hover:bg-drc-gold-400"
                        >
                          Marcar como vendido
                        </button>
                      </form>
                      <ConfirmForm
                        action={deleteLotAbateEventAction}
                        confirmMessage="Excluir este registro de abate em lote? A quantidade volta para o lote."
                      >
                        <input type="hidden" name="eventId" value={ev.id} />
                        <button type="submit" className="text-xs font-medium text-red-600 underline underline-offset-2">
                          Excluir
                        </button>
                      </ConfirmForm>
                    </>
                  )}
                  {isAdmin && resolved && isLote && (
                    <form action={reopenAbateEventAction}>
                      <input type="hidden" name="eventId" value={ev.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                      >
                        Reabrir (foi marcado como vendido sem uma venda lançada)
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>

      <h2 className="mb-2 mt-8 text-sm font-semibold text-drc-green-950">
        Óbitos {mortalityRows.length > 0 && `(${mortalityRows.length})`}
      </h2>
      <Card className="divide-y divide-drc-border/60">
        {mortalityRows.length === 0 ? (
          <EmptyState>Nenhum óbito registrado ainda.</EmptyState>
        ) : (
          mortalityRows.map((ev) => {
            const isLote = !ev.animalId;
            return (
              <div key={ev.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-drc-green-950">{eventTitle(ev)}</p>
                  <Badge tone={ev.confirmedAt ? "green" : "gold"}>
                    {ev.confirmedAt ? "Confirmado" : "Aguardando confirmação"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-drc-green-900/60">
                  {new Date(ev.eventDate).toLocaleDateString("pt-BR")}
                  {ev.reason ? ` · ${ev.reason}` : ""}
                </p>
                <div className="mt-2 space-y-2">
                  <Link
                    href={`/abates-obitos/obito/${ev.id}/editar`}
                    className="inline-block text-xs font-medium text-drc-green-700 underline underline-offset-2"
                  >
                    Editar
                  </Link>
                  {!isLote && ev.animalId && (!ev.confirmedAt || isAdmin) && (
                    <ConfirmForm
                      action={reactivateAnimalAction}
                      confirmMessage={
                        ev.confirmedAt
                          ? "Desfazer este óbito já confirmado? O animal volta para o status Ativo e o registro de óbito é removido. Esta ação não pode ser desfeita."
                          : "Desfazer este óbito? O animal volta para o status Ativo e o registro de óbito é removido."
                      }
                    >
                      <input type="hidden" name="animalId" value={ev.animalId} />
                      <button
                        type="submit"
                        className="inline-block text-xs font-medium text-red-600 underline underline-offset-2"
                      >
                        Desfazer
                      </button>
                    </ConfirmForm>
                  )}
                  {isAdmin && !ev.confirmedAt && (
                    <>
                      <form action={confirmDeathReasonAction} className="space-y-2">
                        <input type="hidden" name="eventId" value={ev.id} />
                        <textarea
                          name="reason"
                          required
                          rows={2}
                          defaultValue={ev.reason ?? ""}
                          placeholder="Confirmar motivo do óbito"
                          className={inputClass}
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-xs font-semibold text-drc-green-950 hover:bg-drc-gold-400"
                        >
                          Confirmar motivo
                        </button>
                      </form>
                      {isLote && (
                        <ConfirmForm
                          action={deleteLotMortalityEventAction}
                          confirmMessage="Excluir este registro de óbito em lote? A quantidade volta para o lote."
                        >
                          <input type="hidden" name="eventId" value={ev.id} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-red-600 underline underline-offset-2"
                          >
                            Excluir
                          </button>
                        </ConfirmForm>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
