"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { walletAccounts } from "@/db/schema";

// Financeiro e Carteira envolvem valores — mesmo padrão admin-only de
// Compras e vendas (ver comentário equivalente em compras-vendas.ts).
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

type WalletType = "dinheiro" | "banco";

// ---------- Carteira ----------
export async function createWalletAccountAction(formData: FormData) {
  const session = await adminFarmSession();
  const name = str(formData.get("name"));
  const type = str(formData.get("type")) as WalletType;
  if (!name || (type !== "dinheiro" && type !== "banco")) return;

  await db.insert(walletAccounts).values({
    farmId: session.farmId,
    name,
    type,
    balance: optNum(formData.get("balance")) ?? 0,
    notes: optStr(formData.get("notes")),
    balanceUpdatedAt: new Date(),
    updatedBy: session.userId,
  });

  revalidatePath("/carteira");
  redirect("/carteira");
}

/**
 * Atualiza o saldo (e opcionalmente a observação) de uma conta. De propósito
 * NÃO grava nada em despesas/vendas — atualizar o saldo aqui é só reportar o
 * saldo real, não gera receita nem despesa (regra explícita do módulo).
 */
export async function updateWalletBalanceAction(formData: FormData) {
  const session = await adminFarmSession();
  const accountId = str(formData.get("accountId"));
  const balance = optNum(formData.get("balance"));
  if (!accountId || balance == null) return;

  await db
    .update(walletAccounts)
    .set({
      balance,
      notes: optStr(formData.get("notes")),
      balanceUpdatedAt: new Date(),
      updatedBy: session.userId,
      updatedAt: new Date(),
    })
    .where(and(eq(walletAccounts.id, accountId), eq(walletAccounts.farmId, session.farmId)));

  revalidatePath("/carteira");
}

export async function deleteWalletAccountAction(formData: FormData) {
  const session = await adminFarmSession();
  const accountId = str(formData.get("accountId"));
  if (!accountId) return;

  await db
    .delete(walletAccounts)
    .where(and(eq(walletAccounts.id, accountId), eq(walletAccounts.farmId, session.farmId)));

  revalidatePath("/carteira");
}
