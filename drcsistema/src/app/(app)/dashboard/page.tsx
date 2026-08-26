import { and, eq, isNull, sql } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { animals, lots } from "@/db/schema";
import { PageHeader, StatCard, Card, EmptyState } from "@/components/ui";
import { overallGpd, formatGpd } from "@/lib/gpd";

export default async function DashboardPage() {
  const session = await requireSession();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;

  // Só conta como "individual" quem NÃO está em lote. Um animal cadastrado
  // individualmente e também vinculado a um lote já faz parte da quantidade
  // daquele lote — contar os dois duplicaria o animal no total.
  const [individualCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(animals)
    .where(
      and(eq(animals.farmId, farmId), eq(animals.status, "ativo"), isNull(animals.lotId))
    );

  const [poCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(animals)
    .where(
      and(eq(animals.farmId, farmId), eq(animals.status, "ativo"), eq(animals.isPO, true))
    );

  const [lotAgg] = await db
    .select({
      lots: sql<number>`count(*)::int`,
      headcount: sql<number>`coalesce(sum(${lots.quantity}), 0)::int`,
    })
    .from(lots)
    .where(and(eq(lots.farmId, farmId), eq(lots.status, "ativo")));

  // GPD médio do rebanho: GPD geral (1ª à última pesagem) de cada animal ativo
  // com pelo menos 2 pesagens, depois a média simples entre esses animais.
  const animalsWithWeighings = await db.query.animals.findMany({
    where: and(eq(animals.farmId, farmId), eq(animals.status, "ativo")),
    columns: { id: true },
    with: { weighings: { columns: { id: true, weightKg: true, weighedAt: true } } },
  });
  const gpdValues = animalsWithWeighings
    .map((a) => overallGpd(a.weighings))
    .filter((g): g is number => g != null);
  const avgGpd =
    gpdValues.length > 0 ? gpdValues.reduce((sum, g) => sum + g, 0) / gpdValues.length : null;

  const individualCount = individualCountRow?.count ?? 0;
  const lotHeadcount = lotAgg?.headcount ?? 0;
  const totalGeral = individualCount + lotHeadcount;

  return (
    <div>
      <PageHeader title="Visão geral" description="Resumo do rebanho DRC" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total no rebanho" value={totalGeral} hint="Sem lote + em lotes" />
        <StatCard label="Sem lote" value={individualCount} hint="Individuais fora de um lote" />
        <StatCard
          label="Em lotes"
          value={lotHeadcount}
          hint={`${lotAgg?.lots ?? 0} lote(s) ativo(s)`}
        />
        <StatCard label="Animais P.O." value={poCountRow?.count ?? 0} />
        <StatCard
          label="GPD médio do rebanho"
          value={formatGpd(avgGpd)}
          hint={
            gpdValues.length > 0
              ? `${gpdValues.length} animal(is) com histórico de pesagem`
              : "Sem pesagens suficientes ainda"
          }
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-drc-green-950">Tarefas de manejo</h2>
          <p className="mt-2 text-sm text-drc-green-900/60">
            Em breve — calendário de manejo.
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-drc-green-950">Resultado comercial</h2>
          <p className="mt-2 text-sm text-drc-green-900/60">
            Em breve — receitas, despesas e resultado comercial.
          </p>
        </Card>
      </div>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-drc-green-950">Acesso rápido</h2>
          <p className="mt-1 text-sm text-drc-green-900/60">Emissão de GTA (Agrodefesa-GO)</p>
        </div>
        <a
          href="https://sidago.agrodefesa.go.gov.br/application/index/login"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-drc-gold-500 px-4 py-2 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
        >
          Emitir GTA
        </a>
      </Card>
    </div>
  );
}
