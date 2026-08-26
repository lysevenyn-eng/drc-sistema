"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { requireSession, requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { managementTasks } from "@/db/schema";

async function farmSession() {
  const session = await requireSession();
  if (!session.farmId) throw new Error("Usuário sem fazenda vinculada");
  return { ...session, farmId: session.farmId };
}

const str = (v: FormDataEntryValue | null) => (v ? String(v).trim() : "");
const optStr = (v: FormDataEntryValue | null) => {
  const s = str(v);
  return s.length ? s : null;
};

type TaskType = "vacina" | "vermifugo" | "medicamento" | "casqueamento" | "outro";
type TargetType = "animal" | "lote";

export async function createManagementTaskAction(formData: FormData) {
  const session = await farmSession();

  const type = str(formData.get("type")) as TaskType;
  const targetType = str(formData.get("targetType")) as TargetType;
  const scheduledDateStr = str(formData.get("scheduledDate"));
  if (!type || !targetType || !scheduledDateStr) return;

  const animalId = targetType === "animal" ? optStr(formData.get("animalId")) : null;
  const lotId = targetType === "lote" ? optStr(formData.get("lotId")) : null;
  if (targetType === "animal" && !animalId) return;
  if (targetType === "lote" && !lotId) return;

  await db.insert(managementTasks).values({
    farmId: session.farmId,
    type,
    product: optStr(formData.get("product")),
    dose: optStr(formData.get("dose")),
    responsible: optStr(formData.get("responsible")),
    targetType,
    animalId,
    lotId,
    scheduledDate: new Date(scheduledDateStr),
    notes: optStr(formData.get("notes")),
    updatedBy: session.userId,
  });

  revalidatePath("/manejo");
  if (animalId) revalidatePath(`/rebanho/animais/${animalId}`);
  redirect("/manejo");
}

/** Marca a tarefa como concluída (hoje). */
export async function completeManagementTaskAction(formData: FormData) {
  const session = await farmSession();
  const taskId = str(formData.get("taskId"));
  const animalId = str(formData.get("animalId"));
  if (!taskId) return;

  await db
    .update(managementTasks)
    .set({ completedDate: new Date(), updatedBy: session.userId, updatedAt: new Date() })
    .where(and(eq(managementTasks.id, taskId), eq(managementTasks.farmId, session.farmId)));

  revalidatePath("/manejo");
  if (animalId) revalidatePath(`/rebanho/animais/${animalId}`);
}

/** Reabre uma tarefa marcada como concluída por engano. */
export async function reopenManagementTaskAction(formData: FormData) {
  const session = await farmSession();
  const taskId = str(formData.get("taskId"));
  const animalId = str(formData.get("animalId"));
  if (!taskId) return;

  await db
    .update(managementTasks)
    .set({ completedDate: null, updatedBy: session.userId, updatedAt: new Date() })
    .where(and(eq(managementTasks.id, taskId), eq(managementTasks.farmId, session.farmId)));

  revalidatePath("/manejo");
  if (animalId) revalidatePath(`/rebanho/animais/${animalId}`);
}

export async function deleteManagementTaskAction(formData: FormData) {
  const session = await requireAdmin();
  if (!session.farmId) return;
  const taskId = str(formData.get("taskId"));
  const animalId = str(formData.get("animalId"));
  if (!taskId) return;

  await db
    .delete(managementTasks)
    .where(and(eq(managementTasks.id, taskId), eq(managementTasks.farmId, session.farmId)));

  revalidatePath("/manejo");
  if (animalId) revalidatePath(`/rebanho/animais/${animalId}`);
}
