"use client";

import { useState } from "react";

type AnimalOption = {
  id: string;
  tag: string;
  name: string | null;
  lot: { name: string } | null;
};

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

export function AbateObitoForm({
  animals,
  isAdmin,
  abateAction,
  obitoAction,
}: {
  animals: AnimalOption[];
  isAdmin: boolean;
  abateAction: (formData: FormData) => void;
  obitoAction: (formData: FormData) => void;
}) {
  const [kind, setKind] = useState<"abate" | "obito">("abate");
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

      {animals.length === 0 ? (
        <p className="text-sm text-drc-green-900/60">Nenhum animal ativo disponível no momento.</p>
      ) : kind === "abate" ? (
        <form action={abateAction} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Peso da carcaça (kg, opcional)">
              <input name="carcassWeightKg" type="number" min={0} step="0.1" className={inputClass} />
            </Field>
            <Field label="Peso vivo antes do abate (kg, opcional)">
              <input name="liveWeightKg" type="number" min={0} step="0.1" className={inputClass} />
            </Field>
          </div>
          <Field label="Data do abate">
            <input name="eventDate" type="date" defaultValue={today} className={inputClass} />
          </Field>
          <Field label="Observações (opcional)">
            <textarea name="notes" rows={2} className={inputClass} />
          </Field>
          <p className="text-xs text-drc-green-900/60">
            O animal já sai do rebanho ativo na hora. Fica pendente até o administrador registrar a
            venda em Compras e vendas — o peso da carcaça informado aqui aparece pré-preenchido lá.
          </p>
          <button
            type="submit"
            className="w-full rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            Registrar abate
          </button>
        </form>
      ) : (
        <form action={obitoAction} className="space-y-4">
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
              O animal já sai do rebanho ativo na hora. Se você não tiver certeza do motivo, pode
              deixar em branco — fica pendente até o administrador confirmar.
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Registrar óbito
          </button>
        </form>
      )}
    </div>
  );
}
