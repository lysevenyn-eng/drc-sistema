"use client";

import { useState } from "react";

type Option = { id: string; tag: string; name: string | null };

const optionLabel = (o: Option) => `${o.tag}${o.name ? ` — ${o.name}` : ""}`;

const inputClass =
  "w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50";

// Só usado quando o Método é "Transferência de embrião" (TE). Nesse caso a
// mãe marcada no evento (motherId / campo "Matrizes"/"Mãe" acima) é a
// receptora — quem carrega e pare a cria, sem parentesco genético. Este
// campo guarda a doadora (mãe genética do embrião), separadamente. Mesmo
// padrão cadastrado x externo do FatherField.
export function DonorMotherField({
  mothers,
  defaultDonorMotherId,
  defaultExternalName,
}: {
  mothers: Option[];
  defaultDonorMotherId?: string;
  defaultExternalName?: string;
}) {
  const [mode, setMode] = useState<"cadastrada" | "externa">(
    defaultExternalName ? "externa" : "cadastrada"
  );
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-drc-green-900">
        Doadora (mãe genética)
      </label>
      <div className="mb-2 flex gap-4 text-sm text-drc-green-900">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="donorMode"
            value="cadastrada"
            checked={mode === "cadastrada"}
            onChange={() => setMode("cadastrada")}
          />
          Cadastrada na fazenda
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="donorMode"
            value="externa"
            checked={mode === "externa"}
            onChange={() => setMode("externa")}
          />
          Externa (embrião de fora)
        </label>
      </div>
      {mode === "cadastrada" ? (
        <select name="donorMotherId" defaultValue={defaultDonorMotherId ?? ""} className={inputClass}>
          <option value="">— Não informado —</option>
          {mothers.map((m) => (
            <option key={m.id} value={m.id}>
              {optionLabel(m)}
            </option>
          ))}
        </select>
      ) : (
        <input
          name="externalDonorName"
          defaultValue={defaultExternalName ?? ""}
          placeholder="Nome ou registro da doadora"
          className={inputClass}
        />
      )}
      <p className="mt-1 text-xs text-drc-green-900/50">
        A mãe marcada acima é a receptora (quem carrega a cria). Aqui é só a doadora do embrião,
        se for diferente.
      </p>
    </div>
  );
}
