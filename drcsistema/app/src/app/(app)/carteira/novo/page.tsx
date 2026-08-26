import { requireAdmin } from "@/lib/session";
import { PageHeader, Card } from "@/components/ui";
import { createWalletAccountAction } from "@/app/actions/financeiro";

export default async function NovaContaPage() {
  await requireAdmin();

  return (
    <div>
      <PageHeader title="Nova conta" description="Dinheiro em caixa ou conta bancária" showBack />
      <Card className="max-w-lg p-5">
        <form action={createWalletAccountAction} className="space-y-4">
          <Field label="Nome">
            <input
              name="name"
              required
              placeholder="Ex.: Caixa da fazenda, Banco do Brasil"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo">
              <select name="type" required defaultValue="dinheiro" className={inputClass}>
                <option value="dinheiro">Dinheiro</option>
                <option value="banco">Banco</option>
              </select>
            </Field>
            <Field label="Saldo inicial (R$)">
              <input name="balance" type="number" step="0.01" defaultValue={0} className={inputClass} />
            </Field>
          </div>

          <Field label="Observação (opcional)">
            <input name="notes" className={inputClass} />
          </Field>

          <button
            type="submit"
            className="rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            Salvar conta
          </button>
        </form>
      </Card>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-drc-green-900">{label}</label>
      {children}
    </div>
  );
}
