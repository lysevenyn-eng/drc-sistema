import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { animals } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { createReproductionEventAction } from "@/app/actions/reproducao";
import { ReproEventForm } from "@/components/repro-event-form";

export default async function NovoEventoReproducaoPage({
  searchParams,
}: {
  searchParams: Promise<{ motherId?: string }>;
}) {
  const session = await requireSession();
  const farmId = session.farmId;
  const { motherId: defaultMotherId } = await searchParams;

  const [mothers, fathers, offspringOptions] = farmId
    ? await Promise.all([
        db.query.animals.findMany({
          where: and(eq(animals.farmId, farmId), eq(animals.sex, "femea"), eq(animals.status, "ativo")),
          orderBy: (a, { asc }) => [asc(a.tag)],
        }),
        db.query.animals.findMany({
          where: and(eq(animals.farmId, farmId), eq(animals.sex, "macho"), eq(animals.status, "ativo")),
          orderBy: (a, { asc }) => [asc(a.tag)],
        }),
        db.query.animals.findMany({
          where: and(eq(animals.farmId, farmId), eq(animals.status, "ativo")),
          orderBy: (a, { asc }) => [asc(a.tag)],
        }),
      ])
    : [[], [], []];

  return (
    <div>
      <PageHeader
        title="Novo evento reprodutivo"
        description="Cobertura, diagnóstico de gestação, parto ou desmame"
      />
      <Card className="max-w-2xl p-5">
        <ReproEventForm
          mothers={mothers}
          fathers={fathers}
          offspringOptions={offspringOptions}
          action={createReproductionEventAction}
          defaultMotherId={defaultMotherId}
        />
      </Card>
    </div>
  );
}
