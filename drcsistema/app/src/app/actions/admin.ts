"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function setUserStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin.farmId) return;

  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!userId || (status !== "aprovado" && status !== "rejeitado")) return;

  await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.farmId, admin.farmId)));

  revalidatePath("/admin");
}

export async function setUserRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin.farmId) return;

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || (role !== "admin" && role !== "criador")) return;
  if (userId === admin.userId) return; // don't let an admin demote themselves by accident

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.farmId, admin.farmId)));

  revalidatePath("/admin");
}

// ---------- Pré-cadastro ----------
const PreRegisterSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe o nome completo" }),
  email: z.email({ error: "Informe um e-mail válido" }).trim().toLowerCase(),
  role: z.enum(["admin", "criador"], { error: "Selecione um papel" }),
});

/**
 * O admin já cria o usuário (nome, e-mail, papel) com a conta aprovada — só
 * falta a senha. A pessoa "ativa" passando pelo /register com o mesmo
 * e-mail: registerAction detecta o passwordHash nulo e só preenche a senha,
 * sem mexer no farmId/role/status definidos aqui.
 */
export async function preRegisterUserAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin.farmId) return;
  const farmId = admin.farmId;

  const parsed = PreRegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    redirect("/admin?preCadastroError=dados");
  }
  const { name, email, role } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    redirect("/admin?preCadastroError=email");
  }

  await db.insert(users).values({
    farmId,
    name,
    email,
    passwordHash: null,
    role,
    status: "aprovado",
  });

  revalidatePath("/admin");
  redirect("/admin?preCadastroSuccess=1");
}

/**
 * Exclui um pré-cadastro. Só funciona enquanto a pessoa não ativou a conta
 * (passwordHash nulo) — depois disso é um usuário de verdade, com o mesmo
 * caminho de qualquer outro (aprovar/rejeitar/trocar papel).
 */
export async function deletePreRegisteredUserAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin.farmId) return;

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await db
    .delete(users)
    .where(and(eq(users.id, userId), eq(users.farmId, admin.farmId), isNull(users.passwordHash)));

  revalidatePath("/admin");
}
