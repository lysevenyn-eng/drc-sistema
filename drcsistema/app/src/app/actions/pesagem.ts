"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { weighings } from "@/db/schema";

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

export async function createWeighingAction(formData: FormData) {
  const session = await farmSession();
  const animalId = str(formData.get("animalId"));
  const weighedAtStr = str(formData.get("weighedAt"));
  const weightKg = Number(str(formData.get("weightKg")));
  if (!animalId || !weighedAtStr || !Number.isFinite(weightKg) || weightKg <= 0) return;

  await db.insert(weighings).values({
    farmId: session.farmId,
    animalId,
    weightKg,
    weighedAt: new Date(weighedAtStr),
    notes: optStr(formData.get("notes")),
    updatedBy: session.userId,
  });

  revalidatePath("/pesagem");
  revalidatePath(`/rebanho/animais/${animalId}`);
  redirect("/pesagem");
}

export async function deleteWeighingAction(formData: FormData) {
  const session = await farmSession();
  const weighingId = str(formData.get("weighingId"));
  const animalId = str(formData.get("animalId"));
  if (!weighingId) return;

  await db
    .delete(weighings)
    .where(and(eq(weighings.id, weighingId), eq(weighings.farmId, session.farmId)));

  revalidatePath("/pesagem");
  if (animalId) revalidatePath(`/rebanho/animais/${animalId}`);
}
