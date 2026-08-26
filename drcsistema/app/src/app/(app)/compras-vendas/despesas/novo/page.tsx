import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { lots, animals } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { createExpenseAction } from "@/app/actions/compras-vendas";

const CATEGORY_LABEL: Record<string, string> = {
  medicamento_vacina: "Medicamento/vacina",
  inseminacao: "Inseminação",
  gta: "GTA/documentação",
  alimentacao: "Alimentação",
  frete: "Frete",
  outras: "Outras",
};

export default async function NovaDespesaPage() {
  const session = await requireAdmin();
  const farmId = session.farmId;

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

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Nova despesa" description="Medicamentos, inseminação, GTA, alimentação, frete ou outras" showBack />
      <Card className="max-w-2xl p-5">
        <form action={createExpenseAction} className="space-y-4">
          <Field label="Categoria">
            <select name="category" required defaultValue="outras" className={inputClass}>
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor (R$)">
              <input name="value" type="number" min={0} step="0.01" required className={inputClass} />
            </Field>
            <Field label="Data">
              <input name="date" type="date" required defaultValue={today} className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Lote (opcional)">
              <select name="lotId" defaultValue="" className={inputClass}>
                <option value="">— Nenhum —</option>
                {activeLots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Animal (opcional)">
              <select name="animalId" defaultValue="" className={inputClass}>
                <option value="">— Nenhum —</option>
                {activeAnimals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tag}
                    {a.name ? ` — ${a.name}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Descrição (opcional)">
            <textarea name="description" rows={3} className={inputClass} />
          </Field>

          <button
            type="submit"
            className="rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            Salvar despesa
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
