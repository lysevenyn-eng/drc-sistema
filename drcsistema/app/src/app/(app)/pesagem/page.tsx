import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { weighings } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { deleteWeighingAction } from "@/app/actions/pesagem";
import { computeGpdSeries, formatGpd } from "@/lib/gpd";

export default async function PesagemPage() {
  const session = await requireSession();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;

  const rows = await db.query.weighings.findMany({
    where: eq(weighings.farmId, farmId),
    with: { animal: true },
    orderBy: (w, { desc }) => [desc(w.weighedAt)],
  });

  // GPD calculado por animal (cada pesagem comparada com a anterior do mesmo animal).
  const byAnimal = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byAnimal.get(r.animalId) ?? [];
    list.push(r);
    byAnimal.set(r.animalId, list);
  }
  const gpdById = new Map<string, number | null>();
  for (const list of byAnimal.values()) {
    for (const [id, gpd] of computeGpdSeries(list)) gpdById.set(id, gpd);
  }

  return (
    <div>
      <PageHeader
        title="Pesagem"
        description="Histórico de pesagens e ganho de peso diário (GPD)"
        action={
          <Link
            href="/pesagem/novo"
            className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            + Nova pesagem
          </Link>
        }
      />

      <Card className="overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState>Nenhuma pesagem registrada ainda.</EmptyState>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Animal</th>
                <th className="px-4 py-2.5">Peso</th>
                <th className="px-4 py-2.5">GPD</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-drc-border/60 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-drc-green-900/80">
                    {new Date(r.weighedAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-drc-green-950">
                    {r.animal ? (
                      <Link
                        href={`/rebanho/animais/${r.animal.id}`}
                        className="underline underline-offset-2"
                      >
                        {r.animal.tag}
                        {r.animal.name ? ` — ${r.animal.name}` : ""}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">{r.weightKg} kg</td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    {formatGpd(gpdById.get(r.id) ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={deleteWeighingAction}>
                      <input type="hidden" name="weighingId" value={r.id} />
                      <input type="hidden" name="animalId" value={r.animalId} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 underline underline-offset-2"
                      >
                        Excluir
                      </button>
                    </form>
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
