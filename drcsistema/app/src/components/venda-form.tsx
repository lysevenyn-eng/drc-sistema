"use client";

import { useState } from "react";

type LotOption = { id: string; name: string; quantity: number };
type AnimalOption = {
  id: string;
  tag: string;
  name: string | null;
  lot: { name: string } | null;
  breedName: string | null;
  birthDate: string | Date | null;
  purchaseDate: string | Date | null;
  latestWeightKg: number | null;
  pendingAbate?: boolean;
};

const SALE_MODE_LABELS: Record<string, string> = {
  vivo_cabeca: "Vivo — por cabeça",
  vivo_peso: "Vivo — por peso",
  carcaca: "Carcaça",
  outra: "Outra",
};

// O lote se mistura com o tempo e não dá pra confiar nele pra identificar um
// animal na hora da venda — por isso o rótulo reúne raça, peso e a data em
// que o animal entrou na fazenda (compra ou nascimento, o que tiver), que não
// mudam com a mistura. O lote ainda aparece por último, quando existir.
function animalOptionLabel(a: AnimalOption) {
  const parts = [`${a.tag}${a.name ? ` — ${a.name}` : ""}`];
  if (a.pendingAbate) parts.push("abatido, aguardando venda");
  parts.push(a.breedName ?? "raça não informada");
  parts.push(a.latestWeightKg != null ? `${a.latestWeightKg} kg` : "peso não registrado");
  if (a.purchaseDate) {
    parts.push(`comprado ${new Date(a.purchaseDate).toLocaleDateString("pt-BR")}`);
  } else if (a.birthDate) {
    parts.push(`nasceu ${new Date(a.birthDate).toLocaleDateString("pt-BR")}`);
  } else {
    parts.push("data de entrada não registrada");
  }
  if (a.lot) parts.push(`Lote: ${a.lot.name}`);
  return parts.join(" · ");
}

export function VendaForm({
  lots,
  animals,
  blendedPoolQuantity,
  action,
  preselectAnimalId,
  presetSaleMode,
  presetCarcassWeightKg,
  presetLiveWeightKg,
}: {
  lots: LotOption[];
  animals: AnimalOption[];
  blendedPoolQuantity: number;
  action: (formData: FormData) => void;
  preselectAnimalId?: string;
  presetSaleMode?: "vivo_cabeca" | "vivo_peso" | "carcaca" | "outra";
  presetCarcassWeightKg?: number | null;
  presetLiveWeightKg?: number | null;
}) {
  const [saleKind, setSaleKind] = useState<"lote" | "individual">(
    preselectAnimalId ? "individual" : "lote"
  );
  const [saleMode, setSaleMode] = useState<"vivo_cabeca" | "vivo_peso" | "carcaca" | "outra">(
    presetSaleMode ?? "vivo_cabeca"
  );
  const [paymentType, setPaymentType] = useState<"a_vista" | "parcelado">("a_vista");
  const [liveWeight, setLiveWeight] = useState(presetLiveWeightKg != null ? String(presetLiveWeightKg) : "");
  const [carcassWeight, setCarcassWeight] = useState(
    presetCarcassWeightKg != null ? String(presetCarcassWeightKg) : ""
  );
  const [quantity, setQuantity] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [pricePerHead, setPricePerHead] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const liveWeightNum = Number(liveWeight);
  const carcassWeightNum = Number(carcassWeight);
  const rendimento =
    liveWeightNum > 0 && carcassWeightNum > 0 ? (carcassWeightNum / liveWeightNum) * 100 : null;

  // Ajudantes opcionais que preenchem "Valor total" automaticamente — o campo
  // continua editável depois, caso o valor combinado seja outro.
  const quantityNum = saleKind === "lote" ? Number(quantity) || 0 : 1;

  function applyPricePerHead(value: string) {
    setPricePerHead(value);
    const n = Number(value);
    if (n > 0 && quantityNum > 0) setTotalValue((n * quantityNum).toFixed(2));
  }

  function applyPricePerKg(value: string) {
    setPricePerKg(value);
    const n = Number(value);
    if (n > 0 && liveWeightNum > 0) setTotalValue((n * liveWeightNum).toFixed(2));
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Tipo de venda">
        <div className="flex gap-4 text-sm text-drc-green-900">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="saleKind"
              value="lote"
              checked={saleKind === "lote"}
              onChange={() => setSaleKind("lote")}
            />
            Por lote
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="saleKind"
              value="individual"
              checked={saleKind === "individual"}
              onChange={() => setSaleKind("individual")}
            />
            Individual
          </label>
        </div>
      </Field>

      {saleKind === "lote" ? (
        <div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Lote">
              <select name="lotId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Selecione o lote
                </option>
                <option value="__misto__">
                  Vários lotes misturados — média entre todos ({blendedPoolQuantity} cabeça
                  {blendedPoolQuantity === 1 ? "" : "s"} no total)
                </option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.quantity} cabeça{l.quantity === 1 ? "" : "s"})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantidade vendida">
              <input
                name="quantity"
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-1.5 text-xs text-drc-green-900/60">
            Não sabe de qual lote exato o animal saiu (comum quando um lote novo entra e se
            mistura com o resto)? Escolha &quot;Vários lotes misturados&quot; — o custo usado é a
            média ponderada entre todos os lotes ativos, e a baixa de quantidade é repartida entre
            eles automaticamente.
          </p>
        </div>
      ) : (
        <Field label="Animal">
          <select name="animalId" required defaultValue={preselectAnimalId ?? ""} className={inputClass}>
            <option value="" disabled>
              Selecione o animal
            </option>
            {animals.map((a) => (
              <option key={a.id} value={a.id}>
                {animalOptionLabel(a)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-drc-green-900/60">
            Cada animal mostra raça, último peso registrado e data de entrada na fazenda (compra
            ou nascimento) — como o lote se mistura com o tempo, essas informações ajudam mais a
            identificar o animal certo do que o nome do lote sozinho. Animais marcados
            &quot;abatido, aguardando venda&quot; vieram de um abate já registrado em Abates e
            óbitos.
          </p>
          {(presetCarcassWeightKg != null || presetLiveWeightKg != null) && (
            <p className="mt-1.5 rounded-lg bg-drc-gold-500/10 px-3 py-2 text-xs text-drc-green-900">
              Peso pré-preenchido a partir do registro de abate — confira antes de salvar.
            </p>
          )}
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Modo da venda">
          <select
            name="saleMode"
            required
            value={saleMode}
            onChange={(e) => setSaleMode(e.target.value as typeof saleMode)}
            className={inputClass}
          >
            {Object.entries(SALE_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Valor total (R$)">
          <input
            name="totalValue"
            type="number"
            min={0}
            step="0.01"
            required
            value={totalValue}
            onChange={(e) => setTotalValue(e.target.value)}
            className={inputClass}
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-drc-green-900/60">
            <span>ou preço por cabeça:</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={pricePerHead}
              onChange={(e) => applyPricePerHead(e.target.value)}
              placeholder="R$"
              className="w-20 rounded border border-drc-border bg-white px-1.5 py-1 text-xs text-drc-green-950 outline-none focus:border-drc-green-700"
            />
            <span>
              × {quantityNum || 0} cabeça{quantityNum === 1 ? "" : "s"} preenche o valor total acima.
            </span>
          </div>
        </Field>
      </div>

      {saleMode === "vivo_peso" && (
        <div className="rounded-lg border border-drc-border bg-drc-green-950/5 p-3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Peso vendido (kg)">
              <input
                name="liveWeightKg"
                type="number"
                min={0}
                step="0.001"
                value={liveWeight}
                onChange={(e) => setLiveWeight(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Preço por kg (R$, opcional)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={pricePerKg}
                onChange={(e) => applyPricePerKg(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-drc-green-900/60">
            Preenchendo peso e preço por kg, o valor total acima é calculado automaticamente (dá
            pra ajustar depois).
          </p>
        </div>
      )}

      {saleMode === "carcaca" && (
        <div className="rounded-lg border border-drc-border bg-drc-green-950/5 p-3">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Peso vivo antes do abate (kg)">
              <input
                name="liveWeightKg"
                type="number"
                min={0}
                step="0.001"
                value={liveWeight}
                onChange={(e) => setLiveWeight(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Peso da carcaça depois (kg)">
              <input
                name="carcassWeightKg"
                type="number"
                min={0}
                step="0.001"
                value={carcassWeight}
                onChange={(e) => setCarcassWeight(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-drc-green-900/60">
            {rendimento != null
              ? `Rendimento de carcaça: ${rendimento.toFixed(1)}%`
              : "Preencha os dois pesos (opcional) para calcular o rendimento de carcaça automaticamente."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Data da venda">
          <input name="saleDate" type="date" required defaultValue={today} className={inputClass} />
        </Field>
        <Field label={`Comprador${paymentType === "parcelado" ? "" : " (opcional)"}`}>
          <input name="buyer" required={paymentType === "parcelado"} className={inputClass} />
          {paymentType === "parcelado" && (
            <p className="mt-1 text-xs text-drc-green-900/50">Usado no lembrete de recebimento.</p>
          )}
        </Field>
      </div>

      <Field label="Forma de recebimento">
        <div className="flex gap-4 text-sm text-drc-green-900">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="paymentType"
              value="a_vista"
              checked={paymentType === "a_vista"}
              onChange={() => setPaymentType("a_vista")}
            />
            À vista
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="paymentType"
              value="parcelado"
              checked={paymentType === "parcelado"}
              onChange={() => setPaymentType("parcelado")}
            />
            A prazo (parcelado)
          </label>
        </div>
      </Field>

      {paymentType === "parcelado" && (
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-drc-green-950/5 p-3">
          <Field label="Número de parcelas">
            <input name="installments" type="number" min={1} defaultValue={2} required className={inputClass} />
          </Field>
          <Field label="Vencimento da 1ª parcela">
            <input name="firstDueDate" type="date" required defaultValue={today} className={inputClass} />
          </Field>
          <p className="col-span-2 text-xs text-drc-green-900/60">
            Cria um lembrete de recebimento por parcela em Contas a receber (Financeiro) e no
            calendário. As parcelas seguintes vencem a cada 30 dias a partir da data acima, com o
            valor total dividido em partes iguais.
          </p>
        </div>
      )}

      <p className="text-xs text-drc-green-900/50">
        Custo e lucro são calculados automaticamente a partir do custo registrado no lote ou no
        próprio animal (quando comprado individual) — não precisa informar aqui.
      </p>

      <button
        type="submit"
        className="rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 hover:bg-drc-gold-400"
      >
        Salvar venda
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
