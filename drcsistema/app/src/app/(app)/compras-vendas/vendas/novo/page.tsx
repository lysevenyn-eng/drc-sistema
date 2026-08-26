import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { lots, animals } from "@/db/schema";
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
          orderBy: (a, { asc }) => [asc(a.tag)],
        }),
      ])
    : [[], []];

  return (
    <div>
      <PageHeader title="Nova venda" description="Por lote (respeitando o saldo) ou individual" showBack />

      {saleError && (
        <Card className="mb-4 border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {ERROR_MESSAGES[saleError] ?? "Não foi possível registrar a venda."}
        </Card>
      )}

      <Card className="max-w-2xl p-5">
        <VendaForm lots={activeLots} animals={activeAnimals} action={createSaleAction} />
      </Card>
    </div>
  );
}
