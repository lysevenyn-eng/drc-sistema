"use client";

import { useState } from "react";

type AnimalOption = {
  id: string;
  tag: string;
  name: string | null;
  lot: { name: string } | null;
};

type LotOption = { id: string; name: string; quantity: number };

function animalOptionLabel(a: AnimalOption) {
  const parts = [`${a.tag}${a.name ? ` — ${a.name}` : ""}`];
  if (a.lot) parts.push(`Lote: ${a.lot.name}`);
  return parts.join(" · ");
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

function ScopeToggle({
  scope,
  setScope,
}: {
  scope: "individual" | "lote";
  setScope: (s: "individual" | "lote") => void;
}) {
  return (
    <Field label="Alcance">
      <div className="flex gap-4 text-sm text-drc-green-900">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={scope === "individual"}
            onChange={() => setScope("individual")}
          />
          Um animal
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={scope === "lote"} onChange={() => setScope("lote")} />
          Vários de um lote
        </label>
      </div>
    </Field>
  );
}

export function AbateObitoForm({
  animals,
  lots,
  isAdmin,
  abateAction,
  obitoAction,
}: {
  animals: AnimalOption[];
  lots: LotOption[];
  isAdmin: boolean;
  abateAction: (formData: FormData) => void;
  obitoAction: (formData: FormData) => void;
}) {
  const [kind, setKind] = useState<"abate" | "obito">("abate");
  const [scope, setScope] = useState<"individual" | "lote">("individual");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-4 flex gap-4 text-sm text-drc-green-900">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={kind === "abate"} onChange={() => setKind("abate")} />
          Registrar abate
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={kind === "obito"} onChange={() => setKind("obito")} />
          Registrar óbito
        </label>
      </div>

      {kind === "abate" ? (
        <form action={abateAction} className="space-y-4">
          <input type="hidden" name="kind" value={scope} />
          <ScopeToggle scope={scope} setScope={setScope} />

          {scope === "individual" ? (
            animals.length === 0 ? (
              <p className="text-sm text-drc-green-900/60">Nenhum animal ativo disponível no momento.</p>
            ) : (
              <Field label="Animal">
                <select name="animalId" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Selecione o animal
                  </option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {animalOptionLabel(a)}
                    </option>
                  ))}
                </select>
              </Field>
            )
          ) : lots.length === 0 ? (
            <p className="text-sm text-drc-green-900/60">Nenhum lote ativo disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Lote">
                <select name="lotId" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Selecione o lote
                  </option>
                  {lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.quantity} cabeça{l.quantity === 1 ? "" : "s"})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quantidade abatida">
                <input name="quantity" type="number" min={1} required className={inputClass} />
              </Field>
            </div>
          )}

          {(scope === "individual" ? animals.length > 0 : lots.length > 0) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label={`Peso da carcaça${scope === "lote" ? " total" : ""} (kg, opcional)`}
                >
                  <input name="carcassWeightKg" type="number" min={0} step="0.001" className={inputClass} />
                </Field>
                <Field label={`Peso vivo${scope === "lote" ? " total" : ""} antes do abate (kg, opcional)`}>
                  <input name="liveWeightKg" type="number" min={0} step="0.001" className={inputClass} />
                </Field>
              </div>
              <Field label="Data do abate">
                <input name="eventDate" type="date" defaultValue={today} className={inputClass} />
              </Field>
              <Field label="Observações (opcional)">
                <textarea name="notes" rows={2} className={inputClass} />
              </Field>
              <p className="text-xs text-drc-green-900/60">
                {scope === "individual"
                  ? "O animal já sai do rebanho ativo na hora. Fica pendente até o administrador registrar a venda em Compras e vendas — o peso da carcaça informado aqui aparece pré-preenchido lá."
                  : "A quantidade já sai do lote na hora. Fica pendente até o administrador marcar como vendido, depois de lançar a(s) venda(s) em Compras e vendas."}
              </p>
              <button
                type="submit"
                className="w-full rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
              >
                Registrar abate
              </button>
            </>
          )}
        </form>
      ) : (
        <form action={obitoAction} className="space-y-4">
          <input type="hidden" name="kind" value={scope} />
          <ScopeToggle scope={scope} setScope={setScope} />

          {scope === "individual" ? (
            animals.length === 0 ? (
              <p className="text-sm text-drc-green-900/60">Nenhum animal ativo disponível no momento.</p>
            ) : (
              <Field label="Animal">
                <select name="animalId" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Selecione o animal
                  </option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {animalOptionLabel(a)}
                    </option>
                  ))}
                </select>
              </Field>
            )
          ) : lots.length === 0 ? (
            <p className="text-sm text-drc-green-900/60">Nenhum lote ativo disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Lote">
                <select name="lotId" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Selecione o lote
                  </option>
                  {lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.quantity} cabeça{l.quantity === 1 ? "" : "s"})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quantidade">
                <input name="quantity" type="number" min={1} required className={inputClass} />
              </Field>
            </div>
          )}

          {(scope === "individual" ? animals.length > 0 : lots.length > 0) && (
            <>
              <Field label={`Motivo${isAdmin ? "" : " (se souber — opcional)"}`}>
                <textarea
                  name="reason"
                  required={isAdmin}
                  rows={3}
                  placeholder="Motivo do óbito (ex.: doença, predador, complicação no parto...)"
                  className={inputClass}
                />
              </Field>
              {!isAdmin && (
                <p className="text-xs text-drc-green-900/60">
                  A baixa já acontece na hora. Se você não tiver certeza do motivo, pode deixar em
                  branco — fica pendente até o administrador confirmar.
                </p>
              )}
              <button
                type="submit"
                className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Registrar óbito
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
