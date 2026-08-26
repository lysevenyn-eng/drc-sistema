import Link from "next/link";
import { and, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { breeds, lots, animals, mortalityEvents, reproductionEvents, weighings } from "@/db/schema";
import { PageHeader, Card, Badge } from "@/components/ui";
import {
  updateAnimalAction,
  registerDeathAction,
  reactivateAnimalAction,
} from "@/app/actions/rebanho";
import { deleteWeighingAction } from "@/app/actions/pesagem";
import { computeGpdSeries, overallGpd, formatGpd } from "@/lib/gpd";

const EVENT_LABEL: Record<string, string> = {
  cobertura: "Cobertura",
  diagnostico_gestacao: "Diagnóstico de gestação",
  parto: "Parto",
  desmame: "Desmame",
  obito: "Óbito",
};

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  if (!session.farmId) notFound();
  const farmId = session.farmId;

  const animal = await db.query.animals.findFirst({
    where: and(eq(animals.id, id), eq(animals.farmId, farmId)),
  });
  if (!animal) notFound();

  const [farmBreeds, activeLots, mothers, fathers, deaths, reproHistory, weighHistory] = await Promise.all([
    db.query.breeds.findMany({ where: eq(breeds.farmId, farmId), orderBy: (b, { asc }) => [asc(b.name)] }),
    db.query.lots.findMany({ where: and(eq(lots.farmId, farmId), eq(lots.status, "ativo")) }),
    db.query.animals.findMany({
      where: and(
        eq(animals.farmId, farmId),
        eq(animals.sex, "femea"),
        eq(animals.status, "ativo"),
        ne(animals.id, id)
      ),
    }),
    db.query.animals.findMany({
      where: and(
        eq(animals.farmId, farmId),
        eq(animals.sex, "macho"),
        eq(animals.status, "ativo"),
        ne(animals.id, id)
      ),
    }),
    db.query.mortalityEvents.findMany({
      where: eq(mortalityEvents.animalId, id),
      orderBy: (m, { desc }) => [desc(m.eventDate)],
    }),
    animal.sex === "femea"
      ? db.query.reproductionEvents.findMany({
          where: eq(reproductionEvents.motherId, id),
          orderBy: (e, { desc }) => [desc(e.eventDate)],
        })
      : Promise.resolve([]),
    db.query.weighings.findMany({
      where: eq(weighings.animalId, id),
      orderBy: (w, { desc }) => [desc(w.weighedAt)],
    }),
  ]);

  const weighGpdById = computeGpdSeries(weighHistory);
  const weighOverallGpd = overallGpd(weighHistory);

  const birthDateValue = animal.birthDate
    ? new Date(animal.birthDate).toISOString().slice(0, 10)
    : "";

  return (
    <div>
      <PageHeader
        title={`${animal.tag}${animal.name ? " — " + animal.name : ""}`}
        description="Editar cadastro do animal"
        action={
          <Badge tone={animal.status === "ativo" ? "green" : animal.status === "vendido" ? "gold" : "red"}>
            {animal.status === "ativo" ? "Ativo" : animal.status === "vendido" ? "Vendido" : "Morto"}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-drc-green-950">Dados do animal</h2>
          <form action={updateAnimalAction} className="space-y-4">
            <input type="hidden" name="animalId" value={animal.id} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Brinco / código">
                <input name="tag" required defaultValue={animal.tag} className={inputClass} />
              </Field>
              <Field label="Nome">
                <input name="name" defaultValue={animal.name ?? ""} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Raça">
                <select name="breedId" defaultValue={animal.breedId ?? ""} className={inputClass}>
                  <option value="">Selecione a raça</option>
                  {farmBreeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sexo">
                <select name="sex" required defaultValue={animal.sex} className={inputClass}>
                  <option value="femea">Fêmea</option>
                  <option value="macho">Macho</option>
                </select>
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isPO"
                name="isPO"
                type="checkbox"
                defaultChecked={animal.isPO}
                className="h-4 w-4 rounded border-drc-border"
              />
              <label htmlFor="isPO" className="text-sm text-drc-green-900">
                Animal P.O. (Puro de Origem)
              </label>
            </div>
            <Field label="Nº de registro genealógico (pedigree)">
              <input name="pedigreeNumber" defaultValue={animal.pedigreeNumber ?? ""} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mãe">
                <select name="motherId" defaultValue={animal.motherId ?? ""} className={inputClass}>
                  <option value="">— Não informado —</option>
                  {mothers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.tag} {m.name ? `— ${m.name}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pai">
                <select name="fatherId" defaultValue={animal.fatherId ?? ""} className={inputClass}>
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
              <Field label="Lote">
                <select name="lotId" defaultValue={animal.lotId ?? ""} className={inputClass}>
                  <option value="">— Sem lote —</option>
                  {activeLots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-drc-green-900/50">
                  Vincular não soma mais um animal ao total — a quantidade do lote já inclui
                  este animal.
                </p>
              </Field>
              <Field label="Data de nascimento">
                <input name="birthDate" type="date" defaultValue={birthDateValue} className={inputClass} />
              </Field>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
            >
              Salvar alterações
            </button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-drc-green-950">Status</h2>
            {animal.status === "ativo" ? (
              <form action={registerDeathAction} className="space-y-3">
                <input type="hidden" name="animalId" value={animal.id} />
                <p className="text-xs text-drc-green-900/60">
                  Registrar óbito — o motivo é obrigatório. Se o animal estiver em um lote, a
                  quantidade do lote será reduzida em 1.
                </p>
                <textarea
                  name="reason"
                  required
                  rows={3}
                  placeholder="Motivo do óbito (ex.: doença, predador, complicação no parto...)"
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Registrar óbito
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-drc-green-900/80">
                  {animal.statusReason || "Sem motivo registrado."}
                </p>
                {animal.statusChangedAt && (
                  <p className="text-xs text-drc-green-900/50">
                    Alterado em {new Date(animal.statusChangedAt).toLocaleString("pt-BR")}
                  </p>
                )}
                <form action={reactivateAnimalAction}>
                  <input type="hidden" name="animalId" value={animal.id} />
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-drc-green-700 px-3 py-2 text-sm font-medium text-drc-green-900 hover:bg-drc-green-950/5"
                  >
                    Reativar animal
                  </button>
                </form>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-drc-green-950">Pesagens</h2>
              <Link
                href={`/pesagem/novo?animalId=${animal.id}`}
                className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
              >
                + Nova pesagem
              </Link>
            </div>
            {weighHistory.length === 0 ? (
              <p className="text-sm text-drc-green-900/60">Nenhuma pesagem registrada ainda.</p>
            ) : (
              <>
                {weighOverallGpd != null && (
                  <p className="mb-3 rounded-lg bg-drc-gold-500/10 px-3 py-2 text-xs font-medium text-drc-green-900">
                    GPD geral: {formatGpd(weighOverallGpd)}
                  </p>
                )}
                <ul className="space-y-2 text-sm text-drc-green-900/80">
                  {weighHistory.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-start justify-between gap-2 border-b border-drc-border/60 pb-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-drc-green-950">
                          {w.weightKg} kg
                          <span className="ml-2 font-normal text-drc-green-900/60">
                            {formatGpd(weighGpdById.get(w.id) ?? null)}
                          </span>
                        </p>
                        <p className="text-xs text-drc-green-900/50">
                          {new Date(w.weighedAt).toLocaleDateString("pt-BR")}
                          {w.notes ? ` — ${w.notes}` : ""}
                        </p>
                      </div>
                      <form action={deleteWeighingAction}>
                        <input type="hidden" name="weighingId" value={w.id} />
                        <input type="hidden" name="animalId" value={animal.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 underline underline-offset-2"
                        >
                          Excluir
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {deaths.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-drc-green-950">Histórico de óbito</h2>
              <ul className="space-y-2 text-sm text-drc-green-900/80">
                {deaths.map((d) => (
                  <li key={d.id} className="border-b border-drc-border/60 pb-2 last:border-0">
                    <p>{d.reason}</p>
                    <p className="text-xs text-drc-green-900/50">
                      {new Date(d.eventDate).toLocaleString("pt-BR")}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {animal.sex === "femea" && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-drc-green-950">Histórico reprodutivo</h2>
                <Link
                  href={`/reproducao/novo?motherId=${animal.id}`}
                  className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                >
                  + Novo evento
                </Link>
              </div>
              {reproHistory.length === 0 ? (
                <p className="text-sm text-drc-green-900/60">Nenhum evento registrado ainda.</p>
              ) : (
                <ul className="space-y-2 text-sm text-drc-green-900/80">
                  {reproHistory.map((ev) => (
                    <li key={ev.id} className="border-b border-drc-border/60 pb-2 last:border-0">
                      <p className="font-medium text-drc-green-950">
                        {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                      </p>
                      {ev.eventType === "parto" && (
                        <p>
                          {ev.offspringCount ?? 0} filhote(s), {ev.liveCount ?? 0} vivo(s)
                        </p>
                      )}
                      {ev.eventType === "diagnostico_gestacao" && (
                        <p>{ev.pregnant === true ? "Positivo" : ev.pregnant === false ? "Negativo" : "—"}</p>
                      )}
                      {ev.notes && <p>{ev.notes}</p>}
                      <p className="text-xs text-drc-green-900/50">
                        {new Date(ev.eventDate).toLocaleDateString("pt-BR")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
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
