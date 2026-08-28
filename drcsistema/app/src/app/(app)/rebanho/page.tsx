import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { lots, animals, breeds } from "@/db/schema";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import {
  createBreedAction,
  updateLotStatusAction,
  updateLotAvgWeightAction,
  deleteLotAction,
  deleteAnimalAction,
} from "@/app/actions/rebanho";
import { ConfirmForm } from "@/components/confirm-form";
import { overallGpd, formatGpd } from "@/lib/gpd";

const STATUS_TONE = { ativo: "green", vendido: "gold", morto: "red", abatido: "neutral" } as const;
const STATUS_LABEL = { ativo: "Ativo", vendido: "Vendido", morto: "Morto", abatido: "Abatido" } as const;

export default async function RebanhoPage() {
  const session = await requireSession();
  if (!session.farmId) return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  const farmId = session.farmId;
  const isAdmin = session.role === "admin";

  const [farmLots, farmAnimals, farmBreeds] = await Promise.all([
    db.query.lots.findMany({
      where: eq(lots.farmId, farmId),
      with: { breed: true },
      orderBy: (l, { desc }) => [desc(l.createdAt)],
    }),
    db.query.animals.findMany({
      where: eq(animals.farmId, farmId),
      with: {
        breed: true,
        lot: true,
        weighings: { columns: { id: true, weightKg: true, weighedAt: true } },
      },
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    }),
    db.query.breeds.findMany({
      where: eq(breeds.farmId, farmId),
      orderBy: (b, { asc }) => [asc(b.name)],
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Rebanho"
        description="Lotes e animais individuais do rebanho"
      />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-drc-green-950">
          Lotes {farmLots.length > 0 && `(${farmLots.length})`}
        </h2>
        <div className="flex items-center gap-3">
          <Link
            href="/rebanho/mudanca-lote"
            className="text-sm font-medium text-drc-green-700 underline underline-offset-2"
          >
            Mudança de lote
          </Link>
          <Link
            href="/rebanho/lotes/novo"
            className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            + Novo lote
          </Link>
        </div>
      </div>
      <Card className="mt-3 overflow-x-auto">
        {farmLots.length === 0 ? (
          <EmptyState>Nenhum lote cadastrado ainda.</EmptyState>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                <th className="px-4 py-2.5">Lote</th>
                <th className="px-4 py-2.5">Raça</th>
                <th className="px-4 py-2.5">Composição</th>
                <th className="px-4 py-2.5">Quantidade</th>
                <th className="px-4 py-2.5">Custo/cabeça</th>
                <th className="px-4 py-2.5">Peso médio</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {farmLots.map((lot) => (
                <tr key={lot.id} className="border-b border-drc-border/60 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-drc-green-950">{lot.name}</td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">{lot.breed?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 capitalize text-drc-green-900/80">{lot.composition}</td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">{lot.quantity}</td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">
                    {lot.costPerHead != null
                      ? lot.costPerHead.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <form action={updateLotAvgWeightAction} className="flex items-center gap-1">
                      <input type="hidden" name="lotId" value={lot.id} />
                      <input
                        name="avgWeightKg"
                        type="number"
                        min={0}
                        step="0.1"
                        defaultValue={lot.avgWeightKg ?? ""}
                        placeholder="—"
                        className="w-16 rounded border border-drc-border bg-white px-1.5 py-1 text-xs text-drc-green-950 outline-none focus:border-drc-green-700"
                      />
                      <span className="text-xs text-drc-green-900/50">kg</span>
                      <button
                        type="submit"
                        className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                      >
                        Salvar
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={lot.status === "ativo" ? "green" : "neutral"}>
                      {lot.status === "ativo" ? "Ativo" : "Encerrado"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <form action={updateLotStatusAction}>
                        <input type="hidden" name="lotId" value={lot.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={lot.status === "ativo" ? "encerrado" : "ativo"}
                        />
                        <button
                          type="submit"
                          className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                        >
                          {lot.status === "ativo" ? "Encerrar" : "Reativar"}
                        </button>
                      </form>
                      <Link
                        href={`/manejo/novo?lotId=${lot.id}`}
                        className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                      >
                        + Tarefa
                      </Link>
                      <Link
                        href={`/rebanho/mudanca-lote?fromLotId=${lot.id}`}
                        className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                      >
                        Mudar de lote
                      </Link>
                      {isAdmin && (
                        <Link
                          href={`/compras-vendas?lotId=${lot.id}`}
                          className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                        >
                          Ver compras
                        </Link>
                      )}
                      {isAdmin && (
                        <ConfirmForm
                          action={deleteLotAction}
                          confirmMessage={`Excluir o lote "${lot.name}"? Os animais vinculados ficam sem lote (não são excluídos), mas as tarefas de manejo agendadas para este lote serão excluídas junto. Esta ação não pode ser desfeita.`}
                        >
                          <input type="hidden" name="lotId" value={lot.id} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-red-600 underline underline-offset-2"
                          >
                            Excluir
                          </button>
                        </ConfirmForm>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-drc-green-950">
          Animais individuais {farmAnimals.length > 0 && `(${farmAnimals.length})`}
        </h2>
        <Link
          href="/rebanho/animais/novo"
          className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
        >
          + Novo animal
        </Link>
      </div>
      <Card className="mt-3 overflow-x-auto">
        {farmAnimals.length === 0 ? (
          <EmptyState>Nenhum animal cadastrado ainda.</EmptyState>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                <th className="px-4 py-2.5">Brinco</th>
                <th className="px-4 py-2.5">Nome</th>
                <th className="px-4 py-2.5">Raça</th>
                <th className="px-4 py-2.5">Sexo</th>
                <th className="px-4 py-2.5">P.O.</th>
                <th className="px-4 py-2.5">Lote</th>
                <th className="px-4 py-2.5">GPD</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {farmAnimals.map((a) => (
                <tr key={a.id} className="border-b border-drc-border/60 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-drc-green-950">{a.tag}</td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">{a.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">{a.breed?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 capitalize text-drc-green-900/80">{a.sex}</td>
                  <td className="px-4 py-2.5">{a.isPO ? <Badge tone="gold">P.O.</Badge> : "—"}</td>
                  <td className="px-4 py-2.5 text-drc-green-900/80">{a.lot?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-drc-green-900/80">
                    {formatGpd(overallGpd(a.weighings))}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <Link
                        href={`/rebanho/animais/${a.id}`}
                        className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                      >
                        Ver / editar
                      </Link>
                      {isAdmin && (
                        <ConfirmForm
                          action={deleteAnimalAction}
                          confirmMessage={`Excluir "${a.tag}" definitivamente? As pesagens e tarefas vinculadas também serão excluídas. Esta ação não pode ser desfeita.`}
                        >
                          <input type="hidden" name="animalId" value={a.id} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-red-600 underline underline-offset-2"
                          >
                            Excluir
                          </button>
                        </ConfirmForm>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-drc-green-950">Raças cadastradas</h2>
        <Card className="mt-3 p-4">
          <div className="flex flex-wrap gap-2">
            {farmBreeds.map((b) => (
              <Badge key={b.id}>{b.name}</Badge>
            ))}
          </div>
          <form action={createBreedAction} className="mt-4 flex gap-2">
            <input
              name="name"
              placeholder="Nova raça (ex.: White Dorper)"
              required
              className="flex-1 rounded-lg border border-drc-border bg-white px-3 py-1.5 text-sm text-drc-green-950 outline-none focus:border-drc-green-700"
            />
            <button
              type="submit"
              className="rounded-lg border border-drc-green-700 px-3 py-1.5 text-sm font-medium text-drc-green-900 hover:bg-drc-green-950/5"
            >
              Adicionar
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
