import { and, eq, or, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { lots, animals, purchases, abateEvents } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { createSaleAction } from "@/app/actions/compras-vendas";
import { VendaForm } from "@/components/venda-form";

const ERROR_MESSAGES: Record<string, string> = {
  saldo: "Quantidade maior do que o saldo disponível. Ajuste a quantidade e tente de novo.",
  status: "Esse animal não está mais ativo (já foi vendido ou não está mais no rebanho).",
};

export default async function NovaVendaPage({
  searchParams,
}: {
  searchParams: Promise<{
    saleError?: string;
    animalId?: string;
    lotId?: string;
    quantity?: string;
    carcassWeightKg?: string;
    liveWeightKg?: string;
    abateEventId?: string;
  }>;
}) {
  const session = await requireAdmin();
  const farmId = session.farmId;
  const {
    saleError,
    animalId: preselectAnimalId,
    lotId: preselectLotId,
    quantity: presetQuantityStr,
    carcassWeightKg: lotCarcassStr,
    liveWeightKg: lotLiveStr,
    abateEventId: presetAbateEventId,
  } = await searchParams;

  // Animais "ativo" (venda direta) e "abatido" (abate registrado antes na
  // tela Abates e óbitos, esperando só a venda — ver registerAbateAction e
  // createSaleAction) aparecem juntos aqui; o rótulo de cada um no formulário
  // deixa claro qual é qual.
  const [activeLots, activeAnimals] = farmId
    ? await Promise.all([
        db.query.lots.findMany({
          where: and(eq(lots.farmId, farmId), eq(lots.status, "ativo")),
          orderBy: (l, { asc }) => [asc(l.name)],
        }),
        db.query.animals.findMany({
          where: and(
            eq(animals.farmId, farmId),
            or(eq(animals.status, "ativo"), eq(animals.status, "abatido"))
          ),
          with: {
            lot: true,
            breed: true,
            weighings: { columns: { weightKg: true, weighedAt: true } },
          },
          orderBy: (a, { asc }) => [asc(a.tag)],
        }),
      ])
    : [[], []];

  // Se veio de "Registrar venda" a partir de um abate pendente, busca o
  // registro de abate pra pré-preencher peso de carcaça/vivo no formulário —
  // a pessoa ainda pode ajustar antes de salvar.
  const pendingAbate =
    farmId && preselectAnimalId
      ? await db.query.abateEvents.findFirst({
          where: and(eq(abateEvents.animalId, preselectAnimalId), eq(abateEvents.farmId, farmId)),
          orderBy: (e, { desc }) => [desc(e.createdAt)],
        })
      : null;

  // O nome do lote nem sempre ajuda a identificar o animal na hora da venda —
  // um lote novo se mistura com o resto do rebanho, e a maioria dos animais
  // (principalmente os de abate) não é marcada individualmente por lote depois
  // disso. Por isso reunimos aqui outras informações mais estáveis: raça,
  // último peso registrado e a data em que o animal entrou na fazenda (compra
  // individual ou nascimento) — ver VendaForm.
  const animalIds = activeAnimals.map((a) => a.id);
  const animalPurchases = animalIds.length
    ? await db.query.purchases.findMany({
        where: inArray(purchases.animalId, animalIds),
        orderBy: (p, { desc }) => [desc(p.purchaseDate)],
      })
    : [];
  const purchaseDateByAnimalId = new Map<string, Date>();
  for (const p of animalPurchases) {
    if (p.animalId && !purchaseDateByAnimalId.has(p.animalId)) {
      purchaseDateByAnimalId.set(p.animalId, p.purchaseDate);
    }
  }

  const animalOptions = activeAnimals.map((a) => {
    const latestWeighing = a.weighings.reduce<{ weightKg: number; weighedAt: Date } | null>(
      (latest, w) => (!latest || new Date(w.weighedAt) > new Date(latest.weighedAt) ? w : latest),
      null
    );
    return {
      id: a.id,
      tag: a.tag,
      name: a.name,
      lot: a.lot ? { name: a.lot.name } : null,
      breedName: a.breed?.name ?? null,
      birthDate: a.birthDate,
      purchaseDate: purchaseDateByAnimalId.get(a.id) ?? null,
      latestWeightKg: latestWeighing?.weightKg ?? null,
      pendingAbate: a.status === "abatido",
    };
  });

  const blendedPoolQuantity = activeLots.reduce((sum, l) => sum + l.quantity, 0);

  // Veio de "Ir para nova venda" a partir de um abate em lote pendente? O
  // peso (e a quantidade) já vêm na própria URL — diferente do caso
  // individual, aqui não precisa buscar no banco: um lote pode ter mais de
  // um abate pendente, então o link já manda o valor exato do abate clicado.
  const lotCarcassWeightKg = lotCarcassStr ? Number(lotCarcassStr) : null;
  const lotLiveWeightKg = lotLiveStr ? Number(lotLiveStr) : null;
  const presetSaleMode = pendingAbate || lotCarcassWeightKg != null || lotLiveWeightKg != null ? "carcaca" : undefined;
  const presetCarcassWeightKg = pendingAbate?.carcassWeightKg ?? lotCarcassWeightKg;
  const presetLiveWeightKg = pendingAbate?.liveWeightKg ?? lotLiveWeightKg;
  const presetQuantity = presetQuantityStr ? Number(presetQuantityStr) : undefined;

  return (
    <div>
      <PageHeader title="Nova venda" description="Por lote (respeitando o saldo) ou individual" showBack />

      {saleError && (
        <Card className="mb-4 border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {ERROR_MESSAGES[saleError] ?? "Não foi possível registrar a venda."}
        </Card>
      )}

      <Card className="max-w-2xl p-5">
        <VendaForm
          lots={activeLots}
          animals={animalOptions}
          blendedPoolQuantity={blendedPoolQuantity}
          action={createSaleAction}
          preselectAnimalId={preselectAnimalId}
          preselectLotId={preselectLotId}
          presetQuantity={presetQuantity}
          presetSaleMode={presetSaleMode}
          presetCarcassWeightKg={presetCarcassWeightKg}
          presetLiveWeightKg={presetLiveWeightKg}
          presetAbateEventId={presetAbateEventId}
        />
      </Card>
    </div>
  );
}
