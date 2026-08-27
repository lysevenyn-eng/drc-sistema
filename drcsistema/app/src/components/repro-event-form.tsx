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
  const [pregnant, setPregnant] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [eventDate, setEventDate] = useState(today);

  // Previsão de parto: 150 dias corridos após a cobertura (gestação típica da
  // Dorper) — só um cálculo de exibição, não é gravado em lugar nenhum.
  const partoPrevisto =
    eventType === "cobertura" && eventDate
      ? (() => {
          const d = new Date(`${eventDate}T00:00:00`);
          if (Number.isNaN(d.getTime())) return null;
          d.setDate(d.getDate() + 150);
          return d.toLocaleDateString("pt-BR");
        })()
      : null;

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

      <Field label="Data do evento">
        <input
          name="eventDate"
          type="date"
          required
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className={inputClass}
        />
        {partoPrevisto && (
          <p className="mt-1 text-xs text-drc-green-900/60">
            Previsão de parto: <strong className="text-drc-green-900">{partoPrevisto}</strong> (150
            dias depois)
          </p>
        )}
      </Field>

      {eventType === "cobertura" ? (
        <Field
          label="Matrizes"
          hint="Pode marcar mais de uma — cria um evento de cobertura para cada uma, com a mesma data e pai."
        >
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-drc-border bg-white p-3">
            {mothers.length === 0 ? (
              <p className="text-xs text-drc-green-900/50">Nenhuma fêmea ativa cadastrada.</p>
            ) : (
              mothers.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm text-drc-green-900">
                  <input
                    type="checkbox"
                    name="motherIds"
                    value={m.id}
                    defaultChecked={m.id === defaultMotherId}
                    className="h-4 w-4 rounded border-drc-border"
                  />
                  {optionLabel(m)}
                </label>
              ))
            )}
          </div>
        </Field>
      ) : (
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
      )}

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
        <>
          <Field label="Resultado">
            <select
              name="pregnant"
              required
              value={pregnant}
              onChange={(e) => setPregnant(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Selecione o resultado
              </option>
              <option value="sim">Positivo — prenhe</option>
              <option value="nao">Negativo</option>
            </select>
          </Field>
          {pregnant === "sim" && (
            <Field
              label="Número de fetos (opcional)"
              hint="Preencha se já souber pelo exame/ultrassom — 2 ou mais marca gemelar no relatório. Se não souber agora, dá pra confirmar depois no parto."
            >
              <input name="fetusCount" type="number" min={1} step={1} className={inputClass} />
            </Field>
          )}
        </>
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
