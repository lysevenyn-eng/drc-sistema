import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { breeds, lots, animals } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { createAnimalAction } from "@/app/actions/rebanho";

export default async function NovoAnimalPage({
  searchParams,
}: {
  searchParams: Promise<{ motherId?: string; fatherId?: string; birthDate?: string }>;
}) {
  const session = await requireSession();
  const farmId = session.farmId;
  const { motherId: prefillMotherId, fatherId: prefillFatherId, birthDate: prefillBirthDate } =
    await searchParams;

  const [farmBreeds, activeLots, mothers, fathers] = farmId
    ? await Promise.all([
        db.query.breeds.findMany({ where: eq(breeds.farmId, farmId), orderBy: (b, { asc }) => [asc(b.name)] }),
        db.query.lots.findMany({ where: and(eq(lots.farmId, farmId), eq(lots.status, "ativo")) }),
        db.query.animals.findMany({
          where: and(eq(animals.farmId, farmId), eq(animals.sex, "femea"), eq(animals.status, "ativo")),
        }),
        db.query.animals.findMany({
          where: and(eq(animals.farmId, farmId), eq(animals.sex, "macho"), eq(animals.status, "ativo")),
        }),
      ])
    : [[], [], [], []];

  return (
    <div>
      <PageHeader title="Novo animal" description="Cadastro individual de animal" />
      {prefillMotherId && (
        <Card className="mb-4 border-drc-gold-500/40 bg-drc-gold-500/10 p-3 text-sm text-drc-green-900">
          Preenchido a partir do evento de parto registrado em Reprodução — confira e complete
          o brinco, nome e sexo do filhote.
        </Card>
      )}
      <Card className="max-w-2xl p-5">
        <form action={createAnimalAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Brinco / código">
              <input name="tag" required className={inputClass} />
            </Field>
            <Field label="Nome">
              <input name="name" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <Field label="Sexo">
              <select name="sex" required className={inputClass} defaultValue="femea">
                <option value="femea">Fêmea</option>
                <option value="macho">Macho</option>
              </select>
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <input id="isPO" name="isPO" type="checkbox" className="h-4 w-4 rounded border-drc-border" />
            <label htmlFor="isPO" className="text-sm text-drc-green-900">
              Animal P.O. (Puro de Origem)
            </label>
          </div>

          <Field label="Nº de registro genealógico (pedigree)">
            <input name="pedigreeNumber" className={inputClass} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Mãe">
              <select name="motherId" className={inputClass} defaultValue={prefillMotherId ?? ""}>
                <option value="">— Não informado —</option>
                {mothers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.tag} {m.name ? `— ${m.name}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-drc-green-900/50">
                Só aparecem fêmeas ativas já cadastradas.
              </p>
            </Field>
            <Field label="Pai">
              <select name="fatherId" className={inputClass} defaultValue={prefillFatherId ?? ""}>
                <option value="">— Não informado —</option>
                {fathers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.tag} {f.name ? `— ${f.name}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Lote (opcional)">
              <select name="lotId" className={inputClass} defaultValue="">
                <option value="">— Sem lote —</option>
                {activeLots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-drc-green-900/50">
                Use quando este animal já faz parte de um lote existente. Vincular não soma
                mais um animal ao total — a quantidade do lote já inclui ele.
              </p>
            </Field>
            <Field label="Data de nascimento">
              <input
                name="birthDate"
                type="date"
                defaultValue={prefillBirthDate ?? ""}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Peso ao nascer (kg, opcional)">
            <input name="birthWeightKg" type="number" min={0} step={0.1} className={inputClass} />
            <p className="mt-1 text-xs text-drc-green-900/50">
              Vira a primeira pesagem do histórico — já entra no cálculo do GPD.
            </p>
          </Field>

          <button
            type="submit"
            className="rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            Salvar animal
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
