"use client";

import { useState } from "react";

type Option = { id: string; tag: string; name: string | null };

const optionLabel = (o: Option) => `${o.tag}${o.name ? ` — ${o.name}` : ""}`;

const inputClass =
  "w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50";

/**
 * Campo "Pai / reprodutor", reutilizado no formulário de evento reprodutivo
 * (cobertura/parto) e no cadastro/edição de animal. Em qualquer um dos dois,
 * o pai pode ser um animal já cadastrado na fazenda (select, como antes) OU
 * um reprodutor externo — nome/registro digitado, sem precisar cadastrá-lo
 * como animal (caso comum em inseminação artificial com sêmen comprado de
 * fora). Só essa alternância (select x texto) precisa de estado — por isso
 * fica isolada num componente client próprio, e o formulário ao redor pode
 * continuar sendo server component.
 */
export function FatherField({
  fathers,
  defaultFatherId,
  defaultExternalName,
  label = "Pai (opcional)",
}: {
  fathers: Option[];
  defaultFatherId?: string;
  defaultExternalName?: string;
  label?: string;
}) {
  const [mode, setMode] = useState<"cadastrado" | "externo">(
    defaultExternalName ? "externo" : "cadastrado"
  );

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-drc-green-900">{label}</label>
      <div className="mb-2 flex gap-4 text-sm text-drc-green-900">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="fatherMode"
            value="cadastrado"
            checked={mode === "cadastrado"}
            onChange={() => setMode("cadastrado")}
          />
          Cadastrado na fazenda
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="fatherMode"
            value="externo"
            checked={mode === "externo"}
            onChange={() => setMode("externo")}
          />
          Externo (sêmen de fora)
        </label>
      </div>
      {mode === "cadastrado" ? (
        <select name="fatherId" defaultValue={defaultFatherId ?? ""} className={inputClass}>
          <option value="">— Não informado —</option>
          {fathers.map((f) => (
            <option key={f.id} value={f.id}>
              {optionLabel(f)}
            </option>
          ))}
        </select>
      ) : (
        <input
          name="externalFatherName"
          defaultValue={defaultExternalName ?? ""}
          placeholder="Nome ou registro do reprodutor"
          className={inputClass}
        />
      )}
    </div>
  );
}
