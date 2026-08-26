"use client";

import { useState } from "react";

type Option = { id: string; tag: string; name: string | null };

const EVENT_LABELS: Record<string, string> = {
  cobertura: "Cobertura",
  diagnostico_gestacao: "Diagnóstico de gestação",
  parto: "Parto",
  desmame: "Desmame",
};

const optionLabel = (o: Option) => `${o.tag}${o.name ? ` — ${o.name}` : ""}`;

export function ReproEventForm({
  mothers,
  fathers,
  offspringOptions,
  action,
  defaultMotherId,
}: {
  mothers: Option[];
  fathers: Option[];
  offspringOptions: Option[];
  action: (formData: FormData) => void;
  defaultMotherId?: string;
}) {
  const [eventType, setEventType] = useState("cobertura");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-4">
      <Field label="Tipo de evento">
        <select
          name="eventType"
          required
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className={inputClass}
        >
          {Object.entries(EVENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Mãe" hint="Só aparecem fêmeas ativas já cadastradas.">
          <select name="motherId" required defaultValue={defaultMotherId ?? ""} className={inputClass}>
            <option value="" disabled>
              Selecione a mãe
            </option>
            {mothers.map((m) => (
              <option key={m.id} value={m.id}>
                {optionLabel(m)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data do evento">
          <input name="eventDate" type="date" required defaultValue={today} className={inputClass} />
        </Field>
      </div>

      {(eventType === "cobertura" || eventType === "parto") && (
        <Field label="Pai (opcional)">
          <select name="fatherId" defaultValue="" className={inputClass}>
            <option value="">— Não informado —</option>
            {fathers.map((f) => (
              <option key={f.id} value={f.id}>
                {optionLabel(f)}
              </option>
            ))}
          </select>
        </Field>
      )}

      {eventType === "diagnostico_gestacao" && (
        <Field label="Resultado">
          <select name="pregnant" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Selecione o resultado
            </option>
            <option value="sim">Positivo — prenhe</option>
            <option value="nao">Negativo</option>
          </select>
        </Field>
      )}

      {eventType === "parto" && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantidade de filhotes">
            <input
              name="offspringCount"
              type="number"
              min={1}
              step={1}
              defaultValue={1}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Nascidos vivos" hint="A diferença para o total conta como natimorto.">
            <input
              name="liveCount"
              type="number"
              min={0}
              step={1}
              defaultValue={1}
              required
              className={inputClass}
            />
          </Field>
        </div>
      )}

      {eventType === "desmame" && (
        <Field label="Filhote desmamado">
          <select name="offspringAnimalId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Selecione o animal
            </option>
            {offspringOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {optionLabel(a)}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Observações">
        <textarea name="notes" rows={3} className={inputClass} />
      </Field>

      {eventType === "parto" && (
        <p className="rounded-lg bg-drc-gold-500/10 p-3 text-xs text-drc-green-900/80">
          Depois de salvar, use o link &quot;Cadastrar filhote&quot; na lista de eventos para
          criar o registro individual de cada filhote que for acompanhar — ele já aparece na
          aba Animais, com mãe, pai e data de nascimento preenchidos.
        </p>
      )}

      <button
        type="submit"
        className="rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
      >
        Salvar evento
      </button>
    </form>
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
