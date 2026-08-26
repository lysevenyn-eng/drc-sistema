"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { reproductionEvents } from "@/db/schema";

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
const optNum = (v: FormDataEntryValue | null) => {
  const s = str(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

type EventType = "cobertura" | "diagnostico_gestacao" | "parto" | "desmame" | "obito";

export async function createReproductionEventAction(formData: FormData) {
  const session = await farmSession();

  const eventType = str(formData.get("eventType")) as EventType;
  const motherId = str(formData.get("motherId"));
  const eventDateStr = str(formData.get("eventDate"));
  if (!eventType || !motherId || !eventDateStr) return;

  // Campos de parto: quantidade total e quantos nasceram vivos (a diferença = natimortos).
  let offspringCount: number | null = null;
  let liveCount: number | null = null;
  if (eventType === "parto") {
    offspringCount = optNum(formData.get("offspringCount")) ?? 1;
    liveCount = optNum(formData.get("liveCount")) ?? offspringCount;
    if (liveCount > offspringCount) liveCount = offspringCount;
    if (liveCount < 0) liveCount = 0;
  }

  // Campo do diagnóstico de gestação.
  let pregnant: boolean | null = null;
  if (eventType === "diagnostico_gestacao") {
    const raw = str(formData.get("pregnant"));
    pregnant = raw === "sim" ? true : raw === "nao" ? false : null;
  }

  // Campo do desmame: qual animal já cadastrado foi desmamado.
  let offspringAnimalId: string | null = null;
  if (eventType === "desmame") {
    offspringAnimalId = optStr(formData.get("offspringAnimalId"));
    if (!offspringAnimalId) return;
  }

  await db.insert(reproductionEvents).values({
    farmId: session.farmId,
    motherId,
    fatherId: optStr(formData.get("fatherId")),
    eventType,
    eventDate: new Date(eventDateStr),
    offspringCount,
    liveCount,
    pregnant,
    offspringAnimalId,
    notes: optStr(formData.get("notes")),
    updatedBy: session.userId,
  });

  revalidatePath("/reproducao");
  redirect("/reproducao");
}

export async function deleteReproductionEventAction(formData: FormData) {
  const session = await farmSession();
  const eventId = str(formData.get("eventId"));
  if (!eventId) return;

  await db
    .delete(reproductionEvents)
    .where(and(eq(reproductionEvents.id, eventId), eq(reproductionEvents.farmId, session.farmId)));

  revalidatePath("/reproducao");
}
