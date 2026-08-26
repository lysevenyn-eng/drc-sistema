"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
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
