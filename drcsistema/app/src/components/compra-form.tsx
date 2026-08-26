"use client";

import { useState } from "react";

type BreedOption = { id: string; name: string };
type LotOption = { id: string; name: string; quantity: number };

export function CompraForm({
  breeds,
  lots,
  action,
}: {
  breeds: BreedOption[];
  lots: LotOption[];
  action: (formData: FormData) => void;
}) {
  const [lotOption, setLotOption] = useState<"novo" | "existente">(lots.length > 0 ? "existente" : "novo");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Quantidade">
          <input name="quantity" type="number" min={1} required className={inputClass} />
        </Field>
        <Field label="Valor total (R$)">
          <input name="totalValue" type="number" min={0} step="0.01" required className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Raça (opcional)">
          <select name="breedId" defaultValue="" className={inputClass}>
            <option value="">Selecione a raça</option>
            {breeds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Composição">
          <select name="composition" required defaultValue="misto" className={inputClass}>
            <option value="macho">Macho</option>
            <option value="femea">Fêmea</option>
            <option value="misto">Misto</option>
          </select>
        </Field>
      </div>

      <Field label="Data da compra">
        <input name="purchaseDate" type="date" required defaultValue={today} className={inputClass} />
      </Field>

      <Field label="Destino da compra">
        <div className="flex gap-4 text-sm text-drc-green-900">
          {lots.length > 0 && (
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="lotOption"
                value="existente"
                checked={lotOption === "existente"}
                onChange={() => setLotOption("existente")}
              />
              Somar a um lote existente
            </label>
          )}
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="lotOption"
              value="novo"
              checked={lotOption === "novo"}
              onChange={() => setLotOption("novo")}
            />
            Criar um novo lote
          </label>
        </div>
      </Field>

      {lotOption === "existente" && lots.length > 0 ? (
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
          <p className="mt-1 text-xs text-drc-green-900/50">
            A quantidade comprada é somada ao lote e o custo por cabeça é recalculado pela
            média ponderada.
          </p>
        </Field>
      ) : (
        <Field label="Nome do novo lote">
          <input name="newLotName" required className={inputClass} placeholder="Ex.: Lote compra jan/2026" />
        </Field>
      )}

      <Field label="Descrição (opcional)">
        <textarea name="description" rows={2} className={inputClass} placeholder="Ex.: origem, vendedor, observações" />
      </Field>

      <button
        type="submit"
        className="rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
      >
        Salvar compra
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
