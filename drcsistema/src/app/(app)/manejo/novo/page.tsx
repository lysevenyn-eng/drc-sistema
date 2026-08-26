import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { animals, lots } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { createManagementTaskAction } from "@/app/actions/manejo";
import { ManejoTaskForm } from "@/components/manejo-task-form";

export default async function NovaTarefaManejoPage({
  searchParams,
}: {
  searchParams: Promise<{ animalId?: string; lotId?: string }>;
}) {
  const session = await requireSession();
  const farmId = session.farmId;
  const { animalId: defaultAnimalId, lotId: defaultLotId } = await searchParams;

  const [activeAnimals, activeLots] = farmId
    ? await Promise.all([
        db.query.animals.findMany({
          where: and(eq(animals.farmId, farmId), eq(animals.status, "ativo")),
          orderBy: (a, { asc }) => [asc(a.tag)],
        }),
        db.query.lots.findMany({
          where: and(eq(lots.farmId, farmId), eq(lots.status, "ativo")),
          orderBy: (l, { asc }) => [asc(l.name)],
        }),
      ])
    : [[], []];

  return (
    <div>
      <PageHeader
        title="Nova tarefa de manejo"
        description="Vacina, vermífugo, medicamento, casqueamento ou outra tarefa"
        showBack
      />
      <Card className="max-w-2xl p-5">
        <ManejoTaskForm
          animals={activeAnimals}
          lots={activeLots}
          action={createManagementTaskAction}
          defaultAnimalId={defaultAnimalId}
          defaultLotId={defaultLotId}
        />
      </Card>
    </div>
  );
}
