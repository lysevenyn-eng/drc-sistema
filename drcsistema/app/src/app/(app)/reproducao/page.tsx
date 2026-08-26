import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { reproductionEvents, animals } from "@/db/schema";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { deleteReproductionEventAction } from "@/app/actions/reproducao";

const EVENT_LABEL: Record<string, string> = {
  cobertura: "Cobertura",
  diagnostico_gestacao: "Diagnóstico de gestação",
  parto: "Parto",
  desmame: "Desmame",
  obito: "Óbito",
};

type AnimalRow = typeof animals.$inferSelect;
type EventRow = typeof reproductionEvents.$inferSelect & {
  mother: AnimalRow | null;
  father: AnimalRow | null;
  offspringAnimal: AnimalRow | null;
};

export default async function ReproducaoPage() {
  const session = await requireSession();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;

  const [events, poAnimals] = await Promise.all([
    db.query.reproductionEvents.findMany({
      where: eq(reproductionEvents.farmId, farmId),
      with: { mother: true, father: true, offspringAnimal: true },
      orderBy: (e, { desc }) => [desc(e.eventDate)],
    }),
    db.query.animals.findMany({
      where: and(eq(animals.farmId, farmId), eq(animals.isPO, true), eq(animals.status, "ativo")),
      with: { breed: true },
      orderBy: (a, { asc }) => [asc(a.tag)],
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Reprodução e P.O."
        description="Cobertura, diagnóstico de gestação, partos, desmames e animais P.O."
        action={
          <Link
            href="/reproducao/novo"
            className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            + Novo evento
          </Link>
        }
      />

      <h2 className="mb-2 text-sm font-semibold text-drc-green-950">
        Eventos {events.length > 0 && `(${events.length})`}
      </h2>
      <Card className="overflow-x-auto">
        {events.length === 0 ? (
          <EmptyState>Nenhum evento reprodutivo registrado ainda.</EmptyState>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Mãe</th>
                <th className="px-4 py-2.5">Pai</th>
                <th className="px-4 py-2.5">Detalhes</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b border-drc-border/60 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-drc-green-900/80">
                    {new Date(ev.eventDate).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-drc-green-950">
                    {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    {ev.mother ? `${ev.mother.tag}${ev.mother.name ? ` — ${ev.mother.name}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    {ev.father ? `${ev.father.tag}${ev.father.name ? ` — ${ev.father.name}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    <EventDetails event={ev} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      {ev.eventType === "parto" && (
                        <Link
                          href={`/rebanho/animais/novo?motherId=${ev.motherId}${
                            ev.fatherId ? `&fatherId=${ev.fatherId}` : ""
                          }&birthDate=${new Date(ev.eventDate).toISOString().slice(0, 10)}`}
                          className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                        >
                          Cadastrar filhote
                        </Link>
                      )}
                      <form action={deleteReproductionEventAction}>
                        <input type="hidden" name="eventId" value={ev.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 underline underline-offset-2"
                        >
                          Excluir
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-drc-green-950">
          Animais P.O. {poAnimals.length > 0 && `(${poAnimals.length})`}
        </h2>
        <Card className="overflow-x-auto">
          {poAnimals.length === 0 ? (
            <EmptyState>Nenhum animal P.O. ativo cadastrado ainda.</EmptyState>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                  <th className="px-4 py-2.5">Brinco</th>
                  <th className="px-4 py-2.5">Nome</th>
                  <th className="px-4 py-2.5">Raça</th>
                  <th className="px-4 py-2.5">Sexo</th>
                  <th className="px-4 py-2.5">Nº registro</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {poAnimals.map((a) => (
                  <tr key={a.id} className="border-b border-drc-border/60 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-drc-green-950">{a.tag}</td>
                    <td className="px-4 py-2.5 text-drc-green-900/80">{a.name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-drc-green-900/80">{a.breed?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 capitalize text-drc-green-900/80">{a.sex}</td>
                    <td className="px-4 py-2.5 text-drc-green-900/80">{a.pedigreeNumber ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/rebanho/animais/${a.id}`}
                        className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                      >
                        Ver / editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

function EventDetails({ event }: { event: EventRow }) {
  switch (event.eventType) {
    case "diagnostico_gestacao":
      if (event.pregnant === true) return <Badge tone="green">Positivo</Badge>;
      if (event.pregnant === false) return <Badge tone="red">Negativo</Badge>;
      return <span>—</span>;
    case "parto": {
      const total = event.offspringCount ?? 0;
      const live = event.liveCount ?? 0;
      const lost = Math.max(total - live, 0);
      return (
        <span>
          {total} filhote(s), {live} vivo(s)
          {lost > 0 ? `, ${lost} natimorto(s)` : ""}
        </span>
      );
    }
    case "desmame":
      return (
        <span>
          {event.offspringAnimal
            ? `${event.offspringAnimal.tag}${event.offspringAnimal.name ? ` — ${event.offspringAnimal.name}` : ""}`
            : "—"}
        </span>
      );
    default:
      return <span>{event.notes ? event.notes : "—"}</span>;
  }
}
