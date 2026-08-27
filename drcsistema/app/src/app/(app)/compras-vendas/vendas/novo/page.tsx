import { and, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { lots, animals, purchases } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { createSaleAction } from "@/app/actions/compras-vendas";
import { VendaForm } from "@/components/venda-form";

const ERROR_MESSAGES: Record<string, string> = {
  saldo: "Quantidade maior do que o saldo disponível no lote. Ajuste a quantidade e tente de novo.",
  status: "Esse animal não está mais ativo (já foi vendido ou não está mais no rebanho).",
};

export default async function NovaVendaPage({
  searchParams,
}: {
  searchParams: Promise<{ saleError?: string }>;
}) {
  const session = await requireAdmin();
  const farmId = session.farmId;
  const { saleError } = await searchParams;

  const [activeLots, activeAnimals] = farmId
    ? await Promise.all([
        db.query.lots.findMany({
          where: and(eq(lots.farmId, farmId), eq(lots.status, "ativo")),
          orderBy: (l, { asc }) => [asc(l.name)],
        }),
        db.query.animals.findMany({
          where: and(eq(animals.farmId, farmId), eq(animals.status, "ativo")),
          with: {
            lot: true,
            breed: true,
            weighings: { columns: { weightKg: true, weighedAt: true } },
          },
          orderBy: (a, { asc }) => [asc(a.tag)],
        }),
      ])
    : [[], []];

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
    };
  });

  return (
    <div>
      <PageHeader title="Nova venda" description="Por lote (respeitando o saldo) ou individual" showBack />

      {saleError && (
        <Card className="mb-4 border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {ERROR_MESSAGES[saleError] ?? "Não foi possível registrar a venda."}
        </Card>
      )}

      <Card className="max-w-2xl p-5">
        <VendaForm lots={activeLots} animals={animalOptions} action={createSaleAction} />
      </Card>
    </div>
  );
}
