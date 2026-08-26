import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { walletAccounts } from "@/db/schema";
import { PageHeader, Card, StatCard, EmptyState, Badge } from "@/components/ui";
import { updateWalletBalanceAction, deleteWalletAccountAction } from "@/app/actions/financeiro";
import { ConfirmForm } from "@/components/confirm-form";
import { formatCurrency } from "@/lib/money";

const TYPE_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  banco: "Banco",
};

export default async function CarteiraPage() {
  const session = await requireAdmin();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;

  const accounts = await db.query.walletAccounts.findMany({
    where: eq(walletAccounts.farmId, farmId),
    orderBy: (w, { asc }) => [asc(w.name)],
  });
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div>
      <PageHeader
        title="Carteira"
        description="Contas de dinheiro e banco, com saldo real. Atualizar o saldo aqui não gera receita nem despesa."
        action={
          <Link
            href="/carteira/novo"
            className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            + Nova conta
          </Link>
        }
      />

      {accounts.length > 0 && (
        <div className="mb-4 max-w-xs">
          <StatCard
            label="Total na carteira"
            value={formatCurrency(total)}
            hint={`${accounts.length} conta${accounts.length === 1 ? "" : "s"}`}
          />
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState>Nenhuma conta cadastrada ainda.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((acc) => (
            <Card key={acc.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-drc-green-950">{acc.name}</h2>
                  <div className="mt-1">
                    <Badge tone={acc.type === "banco" ? "gold" : "green"}>
                      {TYPE_LABEL[acc.type] ?? acc.type}
                    </Badge>
                  </div>
                </div>
                <p className="whitespace-nowrap text-lg font-semibold text-drc-green-950">
                  {formatCurrency(acc.balance)}
                </p>
              </div>
              <p className="mt-2 text-xs text-drc-green-900/50">
                Atualizado em {new Date(acc.balanceUpdatedAt).toLocaleDateString("pt-BR")}
                {acc.notes && ` · ${acc.notes}`}
              </p>

              <form
                action={updateWalletBalanceAction}
                className="mt-4 flex flex-wrap items-end gap-2 border-t border-drc-border pt-3"
              >
                <input type="hidden" name="accountId" value={acc.id} />
                <div>
                  <label className="mb-1 block text-xs font-medium text-drc-green-900">
                    Novo saldo (R$)
                  </label>
                  <input
                    name="balance"
                    type="number"
                    step="0.01"
                    defaultValue={acc.balance}
                    className="w-28 rounded-lg border border-drc-border bg-white px-2.5 py-1.5 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50"
                  />
                </div>
                <div className="min-w-[120px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-drc-green-900">
                    Observação
                  </label>
                  <input
                    name="notes"
                    defaultValue={acc.notes ?? ""}
                    className="w-full rounded-lg border border-drc-border bg-white px-2.5 py-1.5 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-drc-green-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-drc-green-900"
                >
                  Atualizar
                </button>
              </form>

              <ConfirmForm
                action={deleteWalletAccountAction}
                confirmMessage={`Excluir a conta "${acc.name}"? Esta ação não pode ser desfeita.`}
                className="mt-2"
              >
                <input type="hidden" name="accountId" value={acc.id} />
                <button
                  type="submit"
                  className="text-xs font-medium text-red-600 underline underline-offset-2"
                >
                  Excluir conta
                </button>
              </ConfirmForm>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
