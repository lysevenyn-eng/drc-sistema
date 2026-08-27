"use client";

import { useState } from "react";

type AnimalOption = { id: string; tag: string; name: string | null };
type LotOption = { id: string; name: string };
type UserOption = { id: string; name: string };

const TYPE_LABELS: Record<string, string> = {
  vacina: "Vacina",
  vermifugo: "Vermífugo",
  medicamento: "Medicamento",
  casqueamento: "Casqueamento",
  desmame: "Desmame",
  pesagem: "Pesagem",
  outro: "Outro",
};

export function ManejoTaskForm({
  animals,
  lots,
  users,
  action,
  defaultAnimalId,
  defaultLotId,
}: {
  animals: AnimalOption[];
  lots: LotOption[];
  users: UserOption[];
  action: (formData: FormData) => void;
  defaultAnimalId?: string;
  defaultLotId?: string;
}) {
  const [targetType, setTargetType] = useState<"animal" | "lote">(defaultLotId ? "lote" : "animal");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-4">
      <Field label="Tipo de tarefa">
        <select name="type" required defaultValue="vacina" className={inputClass}>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Produto (opcional)">
          <input name="product" placeholder="ex.: Ivermectina" className={inputClass} />
        </Field>
        <Field label="Dose (opcional)">
          <input name="dose" placeholder="ex.: 1 mL / 50 kg" className={inputClass} />
        </Field>
      </div>

      <Field label="Data agendada">
        <input name="scheduledDate" type="date" required defaultValue={today} className={inputClass} />
      </Field>

      <Field label="Responsáveis (opcional)">
        <div className="space-y-1.5 rounded-lg border border-drc-border bg-white p-3">
          {users.length === 0 ? (
            <p className="text-xs text-drc-green-900/50">Nenhum usuário aprovado nesta fazenda ainda.</p>
          ) : (
            users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm text-drc-green-900">
                <input
                  type="checkbox"
                  name="assigneeIds"
                  value={u.id}
                  className="h-4 w-4 rounded border-drc-border"
                />
                {u.name}
              </label>
            ))
          )}
        </div>
        <p className="mt-1 text-xs text-drc-green-900/50">
          Pode marcar mais de um — a tarefa passa a aparecer em &quot;Minhas tarefas&quot; para
          cada um deles.
        </p>
      </Field>

      <Field label="Aplicar em">
        <div className="flex gap-4 text-sm text-drc-green-900">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="targetType"
              value="animal"
              checked={targetType === "animal"}
              onChange={() => setTargetType("animal")}
            />
            Animal individual
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="targetType"
              value="lote"
              checked={targetType === "lote"}
              onChange={() => setTargetType("lote")}
            />
            Lote
          </label>
        </div>
      </Field>

      {targetType === "animal" ? (
        <Field label="Animal">
          <select name="animalId" required defaultValue={defaultAnimalId ?? ""} className={inputClass}>
            <option value="" disabled>
              Selecione o animal
            </option>
            {animals.map((a) => (
              <option key={a.id} value={a.id}>
                {a.tag}
                {a.name ? ` — ${a.name}` : ""}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Lote">
          <select name="lotId" required defaultValue={defaultLotId ?? ""} className={inputClass}>
            <option value="" disabled>
              Selecione o lote
            </option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Observações">
        <textarea name="notes" rows={3} className={inputClass} />
      </Field>

      <button
        type="submit"
        className="rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
      >
        Salvar tarefa
      </button>
    </form>
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
