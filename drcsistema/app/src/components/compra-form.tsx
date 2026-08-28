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
  const [purchaseKind, setPurchaseKind] = useState<"lote" | "individual">("lote");
  const [lotOption, setLotOption] = useState<"novo" | "existente">(lots.length > 0 ? "existente" : "novo");
  const [paymentType, setPaymentType] = useState<"a_vista" | "parcelado">("a_vista");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-4">
      <Field label="Tipo de compra">
        <div className="flex gap-4 text-sm text-drc-green-900">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="purchaseKind"
              value="lote"
              checked={purchaseKind === "lote"}
              onChange={() => setPurchaseKind("lote")}
            />
            Por lote
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="purchaseKind"
              value="individual"
              checked={purchaseKind === "individual"}
              onChange={() => setPurchaseKind("individual")}
            />
            Animal individual
          </label>
        </div>
      </Field>

      <Field label="Fornecedor (opcional)">
        <input
          name="supplierName"
          className={inputClass}
          placeholder="Nome de quem vendeu"
          required={paymentType === "parcelado"}
        />
        <p className="mt-1 text-xs text-drc-green-900/50">
          Usado no lembrete de pagamento quando a compra é parcelada.
        </p>
      </Field>

      {purchaseKind === "lote" ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantidade">
              <input name="quantity" type="number" min={1} required className={inputClass} />
            </Field>
            <Field label="Valor total (R$)">
              <input name="totalValue" type="number" min={0} step="0.01" required className={inputClass} />
            </Field>
          </div>

          <Field label="Peso total do lote (kg, opcional)">
            <input name="totalWeightKg" type="number" min={0} step="0.001" className={inputClass} />
            <p className="mt-1 text-xs text-drc-green-900/50">
              Usado para calcular o peso médio por cabeça do lote — média ponderada, igual ao
              custo por cabeça.
            </p>
          </Field>

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
        </>
      ) : (
        <>
          <p className="rounded-lg bg-drc-green-950/5 px-3 py-2 text-xs text-drc-green-900/70">
            Cadastra o animal no Rebanho e já vincula o valor pago a ele — não precisa cadastrar
            separado depois.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Brinco / código">
              <input name="tag" required className={inputClass} />
            </Field>
            <Field label="Nome (opcional)">
              <input name="name" className={inputClass} />
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
            <Field label="Sexo">
              <select name="sex" required defaultValue="femea" className={inputClass}>
                <option value="femea">Fêmea</option>
                <option value="macho">Macho</option>
              </select>
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <input id="compra-isPO" name="isPO" type="checkbox" className="h-4 w-4 rounded border-drc-border" />
            <label htmlFor="compra-isPO" className="text-sm text-drc-green-900">
              Animal P.O. (Puro de Origem)
            </label>
          </div>

          <Field label="Nº de registro genealógico (pedigree, opcional)">
            <input name="pedigreeNumber" className={inputClass} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Lote (opcional)">
              <select name="lotId" defaultValue="" className={inputClass}>
                <option value="">— Sem lote —</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-drc-green-900/50">
                Se escolher um lote, a quantidade dele sobe 1 — o custo por cabeça do lote não
                muda, o valor pago fica só neste animal.
              </p>
            </Field>
            <Field label="Data de nascimento (opcional)">
              <input name="birthDate" type="date" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor pago (R$)">
              <input name="totalValue" type="number" min={0} step="0.01" required className={inputClass} />
            </Field>
            <Field label="Data da compra">
              <input name="purchaseDate" type="date" required defaultValue={today} className={inputClass} />
            </Field>
          </div>

          <Field label="Descrição (opcional)">
            <textarea name="description" rows={2} className={inputClass} placeholder="Ex.: origem, vendedor, observações" />
          </Field>
        </>
      )}

      <Field label="Forma de pagamento">
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
            Parcelado (boleto/negociação)
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
            Cria um lembrete de pagamento por parcela em Contas a pagar (Financeiro) e no
            calendário, visível só para administradores. As parcelas seguintes vencem a cada 30
            dias a partir da data acima, com o valor total dividido em partes iguais.
          </p>
        </div>
      )}

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
