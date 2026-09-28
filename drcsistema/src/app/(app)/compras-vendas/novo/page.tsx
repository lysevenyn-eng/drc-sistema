import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { breeds, lots } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { createPurchaseAction } from "@/app/actions/compras-vendas";
import { CompraForm } from "@/components/compra-form";

export default async function NovaCompraPage() {
  const session = await requireAdmin();
  const farmId = session.farmId;

  const [farmBreeds, activeLots] = farmId
    ? await Promise.all([
        db.query.breeds.findMany({
          where: eq(breeds.farmId, farmId),
          orderBy: (b, { asc }) => [asc(b.name)],
        }),
        db.query.lots.findMany({
          where: and(eq(lots.farmId, farmId), eq(lots.status, "ativo")),
          orderBy: (l, { asc }) => [asc(l.name)],
        }),
      ])
    : [[], []];

  return (
    <div>
      <PageHeader title="Nova compra" description="Por lote (novo ou somando a um existente) ou de um único animal" showBack />
      <Card className="max-w-2xl p-5">
        <CompraForm breeds={farmBreeds} lots={activeLots} action={createPurchaseAction} />
      </Card>
    </div>
  );
}
