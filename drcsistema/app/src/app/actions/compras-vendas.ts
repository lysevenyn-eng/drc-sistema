"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { purchases, expenses, sales, lots, animals, accountsPayable } from "@/db/schema";

type Sex = "macho" | "femea";

// Compras e vendas envolve valores (custo, receita, lucro) — todo o módulo é
// restrito a admin, diferente de Rebanho/Reprodução/Pesagem/Manejo (onde só a
// exclusão é admin-only). Isso já é reforçado no proxy (src/proxy.ts) para as
// páginas; aqui garante o mesmo nas actions, que é onde a autorização real vale.
async function adminFarmSession() {
  const session = await requireAdmin();
  if (!session.farmId) throw new Error("Usuário sem fazenda vinculada");
  return { ...session, farmId: session.farmId };
}

const str = (v: FormDataEntryValue | null) => (v ? String(v).trim() : "");
const optStr = (v: FormDataEntryValue | null) => {
  const s = str(v);
  return s.length ? s : null;
};
const optNum = (v: FormDataEntryValue | null) => {
  const s = str(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

type Composition = "macho" | "femea" | "misto";
type ExpenseCategory =
  | "medicamento_vacina"
  | "inseminacao"
  | "gta"
  | "alimentacao"
  | "frete"
  | "outras";
type SaleMode = "vivo_cabeca" | "vivo_peso" | "carcaca" | "outra";

/**
 * Divide o valor total em N parcelas iguais (a diferença de arredondamento
 * fica na última) com vencimentos a cada 30 dias a partir de `firstDueDate`.
 * Usado por createPurchaseAction quando o pagamento é parcelado.
 */
function buildInstallments(totalValue: number, installments: number, firstDueDate: Date) {
  const base = Math.round((totalValue / installments) * 100) / 100;
  const rows: { installmentNumber: number; totalInstallments: number; value: number; dueDate: Date }[] = [];
  let allocated = 0;
  for (let i = 0; i < installments; i++) {
    const isLast = i === installments - 1;
    const value = isLast ? Math.round((totalValue - allocated) * 100) / 100 : base;
    allocated += value;
    const dueDate = new Date(firstDueDate);
    dueDate.setDate(dueDate.getDate() + i * 30);
    rows.push({ installmentNumber: i + 1, totalInstallments: installments, value, dueDate });
  }
  return rows;
}

// ---------- Compras ----------
/**
 * Registra uma compra — por lote ou individual (um animal só).
 *
 * Por lote: o lote de destino pode ser criado na hora ("novo") ou já
 * existir ("existente") — nos dois casos a quantidade do lote é
 * incrementada e o custo por cabeça é recalculado. Quando o lote já tinha
 * um custo por cabeça registrado, o novo custo é a média ponderada entre o
 * que já existia e esta compra; quando não tinha (null), assume-se o custo
 * unitário desta compra diretamente (não há base anterior pra ponderar).
 *
 * Individual: cadastra o animal no Rebanho na mesma hora (mesmos campos do
 * formulário de "novo animal", sem mãe/pai — não fazem sentido pra um animal
 * vindo de fora) e grava o valor pago como `acquisitionCost` do próprio
 * animal. Se um lote for informado, o animal já entra vinculado a ele e a
 * quantidade do lote sobe 1 — mas o `costPerHead` do lote não muda, porque o
 * custo desse animal específico já fica registrado nele mesmo (usado depois
 * como prioridade sobre o custo do lote ao calcular lucro numa venda
 * individual — ver createSaleAction).
 */
export async function createPurchaseAction(formData: FormData) {
  const session = await adminFarmSession();
  const purchaseKind = str(formData.get("purchaseKind")) || "lote";

  const supplierName = optStr(formData.get("supplierName"));
  const paymentType = str(formData.get("paymentType")) || "a_vista";
  const installmentsCount = optNum(formData.get("installments"));
  const firstDueDateStr = str(formData.get("firstDueDate"));
  const isParcelado =
    paymentType === "parcelado" && !!installmentsCount && installmentsCount >= 1 && !!firstDueDateStr;

  if (purchaseKind === "individual") {
    const tag = str(formData.get("tag"));
    const sex = str(formData.get("sex")) as Sex;
    const totalValue = optNum(formData.get("totalValue"));
    const purchaseDateStr = str(formData.get("purchaseDate"));
    if (!tag || !sex || !totalValue || totalValue <= 0 || !purchaseDateStr) return;

    const breedId = optStr(formData.get("breedId"));
    const lotId = optStr(formData.get("lotId"));
    const birthDateStr = optStr(formData.get("birthDate"));

    await db.transaction(async (tx) => {
      const [newAnimal] = await tx
        .insert(animals)
        .values({
          farmId: session.farmId,
          tag,
          name: optStr(formData.get("name")),
          breedId,
          sex,
          isPO: formData.get("isPO") === "on",
          pedigreeNumber: optStr(formData.get("pedigreeNumber")),
          lotId,
          birthDate: birthDateStr ? new Date(birthDateStr) : null,
          acquisitionCost: totalValue,
          updatedBy: session.userId,
        })
        .returning({ id: animals.id });

      if (lotId) {
        await tx
          .update(lots)
          .set({ quantity: sql`${lots.quantity} + 1`, updatedAt: new Date() })
          .where(eq(lots.id, lotId));
      }

      const [newPurchase] = await tx
        .insert(purchases)
        .values({
          farmId: session.farmId,
          animalId: newAnimal.id,
          lotId,
          description: optStr(formData.get("description")),
          supplierName,
          quantity: 1,
          breedId,
          composition: sex,
          totalValue,
          purchaseDate: new Date(purchaseDateStr),
          updatedBy: session.userId,
        })
        .returning({ id: purchases.id });

      if (isParcelado) {
        await tx.insert(accountsPayable).values(
          buildInstallments(totalValue, installmentsCount!, new Date(firstDueDateStr)).map((row) => ({
            farmId: session.farmId,
            purchaseId: newPurchase.id,
            updatedBy: session.userId,
            ...row,
          }))
        );
      }
    });

    revalidatePath("/compras-vendas");
    revalidatePath("/rebanho");
    revalidatePath("/financeiro");
    revalidatePath("/manejo/calendario");
    redirect("/compras-vendas");
  }

  const quantity = optNum(formData.get("quantity"));
  const totalValue = optNum(formData.get("totalValue"));
  const lotOption = str(formData.get("lotOption"));
  const purchaseDateStr = str(formData.get("purchaseDate"));
  if (!quantity || quantity <= 0 || !totalValue || totalValue <= 0 || !purchaseDateStr) return;
  if (lotOption !== "novo" && lotOption !== "existente") return;

  const breedId = optStr(formData.get("breedId"));
  const composition = (str(formData.get("composition")) || "misto") as Composition;
  const unitCost = totalValue / quantity;

  await db.transaction(async (tx) => {
    let targetLotId: string;
    if (lotOption === "novo") {
      const newLotName = str(formData.get("newLotName"));
      if (!newLotName) throw new Error("Nome do novo lote é obrigatório");
      const [newLot] = await tx
        .insert(lots)
        .values({
          farmId: session.farmId,
          name: newLotName,
          breedId,
          composition,
          quantity,
          costPerHead: unitCost,
          updatedBy: session.userId,
        })
        .returning({ id: lots.id });
      targetLotId = newLot.id;
    } else {
      const lotId = str(formData.get("lotId"));
      if (!lotId) throw new Error("Selecione um lote existente");
      const existingLot = await tx.query.lots.findFirst({
        where: and(eq(lots.id, lotId), eq(lots.farmId, session.farmId)),
      });
      if (!existingLot) throw new Error("Lote não encontrado");

      const newQuantity = existingLot.quantity + quantity;
      const newCostPerHead =
        existingLot.costPerHead != null
          ? (existingLot.quantity * existingLot.costPerHead + quantity * unitCost) / newQuantity
          : unitCost;

      await tx
        .update(lots)
        .set({ quantity: newQuantity, costPerHead: newCostPerHead, updatedAt: new Date() })
        .where(eq(lots.id, lotId));
      targetLotId = lotId;
    }

    const [newPurchase] = await tx
      .insert(purchases)
      .values({
        farmId: session.farmId,
        lotId: targetLotId,
        description: optStr(formData.get("description")),
        supplierName,
        quantity,
        breedId,
        composition,
        totalValue,
        purchaseDate: new Date(purchaseDateStr),
        updatedBy: session.userId,
      })
      .returning({ id: purchases.id });

    if (isParcelado) {
      await tx.insert(accountsPayable).values(
        buildInstallments(totalValue, installmentsCount!, new Date(firstDueDateStr)).map((row) => ({
          farmId: session.farmId,
          purchaseId: newPurchase.id,
          updatedBy: session.userId,
          ...row,
        }))
      );
    }
  });

  revalidatePath("/compras-vendas");
  revalidatePath("/rebanho");
  revalidatePath("/financeiro");
  revalidatePath("/manejo/calendario");
  redirect("/compras-vendas");
}

/**
 * Exclui uma compra.
 *
 * Por lote: a quantidade do lote vinculado volta atrás (o que essa compra
 * somou é subtraído). O custo por cabeça do lote NÃO é revertido — depois
 * de outras compras/vendas nesse meio tempo, "desfazer" a média ponderada
 * com exatidão deixaria de ser confiável, então preferimos manter o último
 * custo calculado a arriscar um número que pareça exato mas não é.
 *
 * Individual: o animal continua cadastrado (excluir a compra não excluiu o
 * animal) — só o `acquisitionCost` dele volta a null, e se ele tinha sido
 * vinculado a um lote nessa compra, a quantidade do lote volta atrás em 1.
 */
export async function deletePurchaseAction(formData: FormData) {
  const session = await adminFarmSession();
  const purchaseId = str(formData.get("purchaseId"));
  if (!purchaseId) return;

  const purchase = await db.query.purchases.findFirst({
    where: and(eq(purchases.id, purchaseId), eq(purchases.farmId, session.farmId)),
  });
  if (!purchase) return;

  await db.transaction(async (tx) => {
    if (purchase.animalId) {
      await tx
        .update(animals)
        .set({ acquisitionCost: null, updatedAt: new Date() })
        .where(eq(animals.id, purchase.animalId));
      if (purchase.lotId) {
        await tx
          .update(lots)
          .set({ quantity: sql`greatest(${lots.quantity} - 1, 0)`, updatedAt: new Date() })
          .where(eq(lots.id, purchase.lotId));
      }
    } else if (purchase.lotId) {
      await tx
        .update(lots)
        .set({ quantity: sql`greatest(${lots.quantity} - ${purchase.quantity}, 0)`, updatedAt: new Date() })
        .where(eq(lots.id, purchase.lotId));
    }
    await tx.delete(purchases).where(eq(purchases.id, purchaseId));
  });

  revalidatePath("/compras-vendas");
  revalidatePath("/rebanho");
  if (purchase.animalId) revalidatePath(`/rebanho/animais/${purchase.animalId}`);
}

// ---------- Despesas ----------
export async function createExpenseAction(formData: FormData) {
  const session = await adminFarmSession();

  const category = str(formData.get("category")) as ExpenseCategory;
  const value = optNum(formData.get("value"));
  const dateStr = str(formData.get("date"));
  if (!category || !value || value <= 0 || !dateStr) return;

  await db.insert(expenses).values({
    farmId: session.farmId,
    category,
    description: optStr(formData.get("description")),
    value,
    date: new Date(dateStr),
    lotId: optStr(formData.get("lotId")),
    animalId: optStr(formData.get("animalId")),
    updatedBy: session.userId,
  });

  revalidatePath("/compras-vendas/despesas");
  redirect("/compras-vendas/despesas");
}

export async function deleteExpenseAction(formData: FormData) {
  const session = await adminFarmSession();
  const expenseId = str(formData.get("expenseId"));
  if (!expenseId) return;

  await db
    .delete(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.farmId, session.farmId)));

  revalidatePath("/compras-vendas/despesas");
}

// ---------- Vendas ----------
/**
 * Registra uma venda, por lote ou individual. Por lote: reduz a quantidade
 * do lote (bloqueia se pedir mais do que o saldo disponível). Individual:
 * marca o animal como "Vendido" e, se ele estiver vinculado a um lote,
 * reduz 1 unidade daquele lote também — mesmo padrão já usado no óbito.
 * Custo e lucro são calculados a partir do custo por cabeça do lote
 * vinculado (quando existir); sem lote vinculado, ficam em branco.
 */
export async function createSaleAction(formData: FormData) {
  const session = await adminFarmSession();

  const saleKind = str(formData.get("saleKind"));
  const saleMode = str(formData.get("saleMode")) as SaleMode;
  const totalValue = optNum(formData.get("totalValue"));
  const saleDateStr = str(formData.get("saleDate"));
  const buyer = optStr(formData.get("buyer"));
  if ((saleKind !== "lote" && saleKind !== "individual") || !saleMode || !totalValue || totalValue <= 0 || !saleDateStr) {
    return;
  }
  const saleDate = new Date(saleDateStr);
  // Só usados quando o modo de venda é "carcaça" — o formulário só mostra os
  // dois campos nesse caso, mas aceitar sempre que vierem preenchidos é mais
  // simples do que travar no saleMode aqui também.
  const liveWeightKg = optNum(formData.get("liveWeightKg"));
  const carcassWeightKg = optNum(formData.get("carcassWeightKg"));

  if (saleKind === "lote") {
    const lotId = str(formData.get("lotId"));
    const quantity = optNum(formData.get("quantity"));
    if (!lotId || !quantity || quantity <= 0) return;

    const lot = await db.query.lots.findFirst({
      where: and(eq(lots.id, lotId), eq(lots.farmId, session.farmId)),
    });
    if (!lot) return;
    if (quantity > lot.quantity) {
      redirect("/compras-vendas/vendas/novo?saleError=saldo");
    }

    const costBasis = lot.costPerHead != null ? lot.costPerHead * quantity : null;
    const profit = costBasis != null ? totalValue - costBasis : null;

    await db.transaction(async (tx) => {
      await tx
        .update(lots)
        .set({ quantity: sql`greatest(${lots.quantity} - ${quantity}, 0)`, updatedAt: new Date() })
        .where(eq(lots.id, lotId));

      await tx.insert(sales).values({
        farmId: session.farmId,
        saleType: "lote",
        lotId,
        quantity,
        saleMode,
        unitValue: totalValue / quantity,
        totalValue,
        costBasis,
        profit,
        liveWeightKg,
        carcassWeightKg,
        saleDate,
        buyer,
        updatedBy: session.userId,
      });
    });

    revalidatePath("/compras-vendas/vendas");
    revalidatePath("/rebanho");
    redirect("/compras-vendas/vendas");
  } else {
    const animalId = str(formData.get("animalId"));
    if (!animalId) return;

    const animal = await db.query.animals.findFirst({
      where: and(eq(animals.id, animalId), eq(animals.farmId, session.farmId)),
    });
    if (!animal || animal.status !== "ativo") {
      redirect("/compras-vendas/vendas/novo?saleError=status");
    }

    const lot = animal.lotId
      ? await db.query.lots.findFirst({ where: eq(lots.id, animal.lotId) })
      : null;
    // Prioridade: custo de aquisição do próprio animal (comprado individual)
    // primeiro; se não tiver, cai pro custo médio do lote (comprado em lote).
    const costBasis = animal.acquisitionCost ?? lot?.costPerHead ?? null;
    const profit = costBasis != null ? totalValue - costBasis : null;

    await db.transaction(async (tx) => {
      await tx
        .update(animals)
        .set({
          status: "vendido",
          statusChangedAt: new Date(),
          updatedBy: session.userId,
          updatedAt: new Date(),
        })
        .where(eq(animals.id, animalId));

      if (animal.lotId) {
        await tx
          .update(lots)
          .set({ quantity: sql`greatest(${lots.quantity} - 1, 0)`, updatedAt: new Date() })
          .where(eq(lots.id, animal.lotId));
      }

      await tx.insert(sales).values({
        farmId: session.farmId,
        saleType: "individual",
        animalId,
        lotId: animal.lotId,
        quantity: 1,
        saleMode,
        unitValue: totalValue,
        totalValue,
        costBasis,
        profit,
        liveWeightKg,
        carcassWeightKg,
        saleDate,
        buyer,
        updatedBy: session.userId,
      });
    });

    revalidatePath("/compras-vendas/vendas");
    revalidatePath("/rebanho");
    revalidatePath(`/rebanho/animais/${animalId}`);
    redirect("/compras-vendas/vendas");
  }
}

/** Exclui uma venda: devolve a quantidade ao lote e, se individual, reativa o animal. */
export async function deleteSaleAction(formData: FormData) {
  const session = await adminFarmSession();
  const saleId = str(formData.get("saleId"));
  if (!saleId) return;

  const sale = await db.query.sales.findFirst({
    where: and(eq(sales.id, saleId), eq(sales.farmId, session.farmId)),
  });
  if (!sale) return;

  await db.transaction(async (tx) => {
    if (sale.saleType === "lote" && sale.lotId) {
      await tx
        .update(lots)
        .set({ quantity: sql`${lots.quantity} + ${sale.quantity}`, updatedAt: new Date() })
        .where(eq(lots.id, sale.lotId));
    }

    if (sale.saleType === "individual" && sale.animalId) {
      const animal = await tx.query.animals.findFirst({ where: eq(animals.id, sale.animalId) });
      if (animal && animal.status === "vendido") {
        await tx
          .update(animals)
          .set({
            status: "ativo",
            statusChangedAt: null,
            updatedBy: session.userId,
            updatedAt: new Date(),
          })
          .where(eq(animals.id, sale.animalId));

        if (sale.lotId) {
          await tx
            .update(lots)
            .set({ quantity: sql`${lots.quantity} + 1`, updatedAt: new Date() })
            .where(eq(lots.id, sale.lotId));
        }
      }
    }

    await tx.delete(sales).where(eq(sales.id, saleId));
  });

  revalidatePath("/compras-vendas/vendas");
  revalidatePath("/rebanho");
  if (sale.animalId) revalidatePath(`/rebanho/animais/${sale.animalId}`);
}
