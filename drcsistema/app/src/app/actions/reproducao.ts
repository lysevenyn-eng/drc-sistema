"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { requireSession, requireAdmin } from "@/lib/session";
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
  const eventDateStr = str(formData.get("eventDate"));
  if (!eventType || !eventDateStr) return;
  const eventDate = new Date(eventDateStr);

  // Campos de parto: quantidade total e quantos nasceram vivos (a diferença = natimortos).
  let offspringCount: number | null = null;
  let liveCount: number | null = null;
  if (eventType === "parto") {
    offspringCount = optNum(formData.get("offspringCount")) ?? 1;
    liveCount = optNum(formData.get("liveCount")) ?? offspringCount;
    if (liveCount > offspringCount) liveCount = offspringCount;
    if (liveCount < 0) liveCount = 0;
  }

  // Campo do diagnóstico de gestação — nº de fetos só faz sentido quando positivo,
  // e é opcional mesmo assim (pode não ter sido possível contar no exame).
  let pregnant: boolean | null = null;
  let fetusCount: number | null = null;
  if (eventType === "diagnostico_gestacao") {
    const raw = str(formData.get("pregnant"));
    pregnant = raw === "sim" ? true : raw === "nao" ? false : null;
    if (pregnant === true) {
      fetusCount = optNum(formData.get("fetusCount"));
    }
  }

  // Campo do desmame: qual animal já cadastrado foi desmamado.
  let offspringAnimalId: string | null = null;
  if (eventType === "desmame") {
    offspringAnimalId = optStr(formData.get("offspringAnimalId"));
    if (!offspringAnimalId) return;
  }

  const fatherId = optStr(formData.get("fatherId"));
  const notes = optStr(formData.get("notes"));

  if (eventType === "cobertura") {
    // Múltiplas matrizes na mesma cobertura: um evento por matriz marcada,
    // todos com a mesma data/pai/observações (ver ReproEventForm).
    const motherIds = [...new Set(formData.getAll("motherIds").map(String).filter(Boolean))];
    if (motherIds.length === 0) return;

    await db.insert(reproductionEvents).values(
      motherIds.map((motherId) => ({
        farmId: session.farmId,
        motherId,
        fatherId,
        eventType,
        eventDate,
        notes,
        updatedBy: session.userId,
      }))
    );
  } else {
    const motherId = str(formData.get("motherId"));
    if (!motherId) return;

    await db.insert(reproductionEvents).values({
      farmId: session.farmId,
      motherId,
      fatherId,
      eventType,
      eventDate,
      offspringCount,
      liveCount,
      pregnant,
      fetusCount,
      offspringAnimalId,
      notes,
      updatedBy: session.userId,
    });
  }

  revalidatePath("/reproducao");
  revalidatePath("/relatorios");
  redirect("/reproducao");
}

/**
 * Encerra uma cobertura sem diagnóstico/parto/óbito posterior — ex.: matriz
 * vendida, ou decidiu não acompanhar esse ciclo. Só se aplica a eventos
 * "cobertura"; tira a cobertura da lista de "aguardando resultado" no
 * relatório de reprodução (ver /relatorios).
 */
export async function closeCoberturaAction(formData: FormData) {
  const session = await farmSession();
  const eventId = str(formData.get("eventId"));
  if (!eventId) return;

  await db
    .update(reproductionEvents)
    .set({ closedWithoutResult: true, updatedBy: session.userId, updatedAt: new Date() })
    .where(
      and(
        eq(reproductionEvents.id, eventId),
        eq(reproductionEvents.farmId, session.farmId),
        eq(reproductionEvents.eventType, "cobertura")
      )
    );

  revalidatePath("/reproducao");
  revalidatePath("/relatorios");
}

/** Reabre uma cobertura encerrada sem resultado por engano. */
export async function reopenCoberturaAction(formData: FormData) {
  const session = await farmSession();
  const eventId = str(formData.get("eventId"));
  if (!eventId) return;

  await db
    .update(reproductionEvents)
    .set({ closedWithoutResult: false, updatedBy: session.userId, updatedAt: new Date() })
    .where(and(eq(reproductionEvents.id, eventId), eq(reproductionEvents.farmId, session.farmId)));

  revalidatePath("/reproducao");
  revalidatePath("/relatorios");
}

export async function deleteReproductionEventAction(formData: FormData) {
  const session = await requireAdmin();
  if (!session.farmId) return;
  const eventId = str(formData.get("eventId"));
  if (!eventId) return;

  await db
    .delete(reproductionEvents)
    .where(and(eq(reproductionEvents.id, eventId), eq(reproductionEvents.farmId, session.farmId)));

  revalidatePath("/reproducao");
}
