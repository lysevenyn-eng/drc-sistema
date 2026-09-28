"use client";

import { useState } from "react";

type AnimalOption = {
  id: string;
  tag: string;
  name: string | null;
  lotId: string;
  lotName: string;
};

type LotOption = { id: string; name: string; quantity: number };

function animalOptionLabel(a: AnimalOption) {
  return `${a.tag}${a.name ? ` — ${a.name}` : ""} · Lote: ${a.lotName}`;
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

export function MudancaLoteForm({
  animals,
  lots,
  action,
  presetFromLotId,
}: {
  animals: AnimalOption[];
  lots: LotOption[];
  action: (formData: FormData) => void;
  presetFromLotId?: string;
}) {
  const [scope, setScope] = useState<"lote" | "individual">("lote");
  const today = new Date().toISOString().slice(0, 10);

  if (lots.length < 2) {
    return (
      <p className="text-sm text-drc-green-900/60">
        Você precisa de pelo menos dois lotes ativos pra mudar animais de um pro outro.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={scope} />

      <Field label="Alcance">
        <div className="flex gap-4 text-sm text-drc-green-900">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={scope === "lote"} onChange={() => setScope("lote")} />
            Vários de um lote
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={scope === "individual"}
              onChange={() => setScope("individual")}
            />
            Um animal
          </label>
        </div>
      </Field>

      {scope === "lote" ? (
        <div className="grid grid-cols-3 gap-4">
          <Field label="De (lote de origem)">
            <select name="fromLotId" required defaultValue={presetFromLotId ?? ""} className={inputClass}>
              <option value="" disabled>
                Selecione
              </option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.quantity} cabeça{l.quantity === 1 ? "" : "s"})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Para (lote de destino)">
            <select name="toLotId" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Selecione
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
      ) : animals.length === 0 ? (
        <p className="text-sm text-drc-green-900/60">Nenhum animal individual em um lote no momento.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
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
          <Field label="Para (lote de destino)">
            <select name="toLotId" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Selecione
              </option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.quantity} cabeça{l.quantity === 1 ? "" : "s"})
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {(scope === "lote" || animals.length > 0) && (
        <>
          <Field label="Data">
            <input name="eventDate" type="date" defaultValue={today} className={inputClass} />
          </Field>
          <Field label="Observações (opcional)">
            <textarea name="notes" rows={2} placeholder="Ex.: separação pro confinamento 1" className={inputClass} />
          </Field>
          <p className="text-xs text-drc-green-900/60">
            A mudança acontece na hora — a quantidade sai do lote de origem e entra no de destino
            direto, sem precisar de confirmação de ninguém.
          </p>
          <button
            type="submit"
            className="w-full rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            Registrar mudança
          </button>
        </>
      )}
    </form>
  );
}
