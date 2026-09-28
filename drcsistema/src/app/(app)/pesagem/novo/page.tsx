import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { animals } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { createWeighingAction } from "@/app/actions/pesagem";

export default async function NovaPesagemPage({
  searchParams,
}: {
  searchParams: Promise<{ animalId?: string }>;
}) {
  const session = await requireSession();
  const farmId = session.farmId;
  const { animalId: defaultAnimalId } = await searchParams;

  const activeAnimals = farmId
    ? await db.query.animals.findMany({
        where: and(eq(animals.farmId, farmId), eq(animals.status, "ativo")),
        orderBy: (a, { asc }) => [asc(a.tag)],
      })
    : [];

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Nova pesagem" description="Registrar o peso de um animal" showBack />
      <Card className="max-w-xl p-5">
        <form action={createWeighingAction} className="space-y-4">
          <Field label="Animal" hint="Busque pelo brinco ou nome na lista.">
            <select name="animalId" required defaultValue={defaultAnimalId ?? ""} className={inputClass}>
              <option value="" disabled>
                Selecione o animal
              </option>
              {activeAnimals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tag}
                  {a.name ? ` — ${a.name}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Peso (kg)">
              <input name="weightKg" type="number" min={0} step={0.001} required className={inputClass} />
            </Field>
            <Field label="Data da pesagem">
              <input name="weighedAt" type="date" required defaultValue={today} className={inputClass} />
            </Field>
          </div>

          <Field label="Observações">
            <textarea name="notes" rows={3} className={inputClass} />
          </Field>

          <button
            type="submit"
            className="rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            Salvar pesagem
          </button>
        </form>
      </Card>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-drc-green-900">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-drc-green-900/50">{hint}</p>}
    </div>
  );
}
