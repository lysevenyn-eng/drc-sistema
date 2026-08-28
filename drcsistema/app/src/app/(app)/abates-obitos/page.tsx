import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { animals, abateEvents, mortalityEvents } from "@/db/schema";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { registerAbateAction, registerDeathAction, confirmDeathReasonAction } from "@/app/actions/rebanho";
import { AbateObitoForm } from "@/components/abate-obito-form";

const inputClass =
  "w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50";

export default async function AbatesObitosPage() {
  const session = await requireSession();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;
  const isAdmin = session.role === "admin";

  const [activeAnimals, abateRows, mortalityRows] = await Promise.all([
    db.query.animals.findMany({
      where: and(eq(animals.farmId, farmId), eq(animals.status, "ativo")),
      with: { lot: true },
      orderBy: (a, { asc }) => [asc(a.tag)],
    }),
    db.query.abateEvents.findMany({
      where: eq(abateEvents.farmId, farmId),
      with: { animal: true },
      orderBy: (e, { desc }) => [desc(e.eventDate)],
      limit: 25,
    }),
    db.query.mortalityEvents.findMany({
      where: eq(mortalityEvents.farmId, farmId),
      with: { animal: true },
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

  return (
    <div>
      <PageHeader
        title="Abates e óbitos"
        description="Registre um abate ou óbito — a baixa do animal acontece na hora; se você não for admin, fica pendente até a confirmação"
      />

      <Card className="max-w-2xl p-5">
        <AbateObitoForm
          animals={animalOptions}
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
          abateRows.map((ev) => (
            <div key={ev.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-drc-green-950">
                  {ev.animal ? `${ev.animal.tag}${ev.animal.name ? ` — ${ev.animal.name}` : ""}` : "Animal excluído"}
                </p>
                <Badge tone={ev.saleId ? "green" : "gold"}>
                  {ev.saleId ? "Vendido" : "Aguardando venda"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-drc-green-900/60">
                {new Date(ev.eventDate).toLocaleDateString("pt-BR")}
                {ev.carcassWeightKg != null ? ` · carcaça ${ev.carcassWeightKg} kg` : ""}
                {ev.liveWeightKg != null ? ` · vivo ${ev.liveWeightKg} kg` : ""}
              </p>
              {ev.notes && <p className="mt-1 text-xs text-drc-green-900/60">{ev.notes}</p>}
              {isAdmin && !ev.saleId && ev.animalId && (
                <Link
                  href={`/compras-vendas/vendas/novo?animalId=${ev.animalId}`}
                  className="mt-2 inline-block text-xs font-medium text-drc-green-700 underline underline-offset-2"
                >
                  Registrar venda →
                </Link>
              )}
            </div>
          ))
        )}
      </Card>

      <h2 className="mb-2 mt-8 text-sm font-semibold text-drc-green-950">
        Óbitos {mortalityRows.length > 0 && `(${mortalityRows.length})`}
      </h2>
      <Card className="divide-y divide-drc-border/60">
        {mortalityRows.length === 0 ? (
          <EmptyState>Nenhum óbito registrado ainda.</EmptyState>
        ) : (
          mortalityRows.map((ev) => (
            <div key={ev.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-drc-green-950">
                  {ev.animal ? `${ev.animal.tag}${ev.animal.name ? ` — ${ev.animal.name}` : ""}` : "Animal excluído"}
                </p>
                <Badge tone={ev.confirmedAt ? "green" : "gold"}>
                  {ev.confirmedAt ? "Confirmado" : "Aguardando confirmação"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-drc-green-900/60">
                {new Date(ev.eventDate).toLocaleDateString("pt-BR")}
                {ev.reason ? ` · ${ev.reason}` : ""}
              </p>
              {isAdmin && !ev.confirmedAt && (
                <form action={confirmDeathReasonAction} className="mt-2 space-y-2">
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
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
