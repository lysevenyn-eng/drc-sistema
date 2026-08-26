import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { breeds } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { createLotAction } from "@/app/actions/rebanho";

export default async function NovoLotePage() {
  const session = await requireSession();
  const farmBreeds = session.farmId
    ? await db.query.breeds.findMany({
        where: eq(breeds.farmId, session.farmId),
        orderBy: (b, { asc }) => [asc(b.name)],
      })
    : [];

  return (
    <div>
      <PageHeader title="Novo lote" description="Cadastrar um novo lote de animais" showBack />
      <Card className="max-w-xl p-5">
        <form action={createLotAction} className="space-y-4">
          <Field label="Nome do lote">
            <input name="name" required className={inputClass} placeholder="Ex.: Lote fêmeas 2026" />
          </Field>
          <Field label="Raça">
            <select name="breedId" className={inputClass} defaultValue="">
              <option value="">Selecione a raça</option>
              {farmBreeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Composição">
            <select name="composition" required className={inputClass} defaultValue="misto">
              <option value="macho">Macho</option>
              <option value="femea">Fêmea</option>
              <option value="misto">Misto</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantidade">
              <input name="quantity" type="number" min={0} required className={inputClass} defaultValue={0} />
            </Field>
            <Field label="Custo por cabeça (R$)">
              <input name="costPerHead" type="number" min={0} step="0.01" className={inputClass} />
            </Field>
          </div>
          <Field label="Observações">
            <textarea name="notes" rows={3} className={inputClass} />
          </Field>
          <button
            type="submit"
            className="rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            Salvar lote
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
