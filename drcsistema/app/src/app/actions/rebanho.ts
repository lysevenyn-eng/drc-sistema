"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { animals, lots, breeds, mortalityEvents, weighings } from "@/db/schema";

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

// ---------- Breeds ----------
export async function createBreedAction(formData: FormData) {
  const session = await farmSession();
  const name = str(formData.get("name"));
  if (!name) return;
  await db.insert(breeds).values({ farmId: session.farmId, name });
  revalidatePath("/rebanho");
}

// ---------- Lots ----------
export async function createLotAction(formData: FormData) {
  const session = await farmSession();
  const name = str(formData.get("name"));
  const composition = str(formData.get("composition")) as "macho" | "femea" | "misto";
  if (!name || !composition) return;

  await db.insert(lots).values({
    farmId: session.farmId,
    name,
    breedId: optStr(formData.get("breedId")),
    composition,
    quantity: optNum(formData.get("quantity")) ?? 0,
    costPerHead: optNum(formData.get("costPerHead")),
    notes: optStr(formData.get("notes")),
    updatedBy: session.userId,
  });

  revalidatePath("/rebanho");
  redirect("/rebanho");
}

export async function updateLotStatusAction(formData: FormData) {
  const session = await farmSession();
  const lotId = str(formData.get("lotId"));
  const status = str(formData.get("status")) as "ativo" | "encerrado";
  if (!lotId || !status) return;

  await db
    .update(lots)
    .set({ status, updatedBy: session.userId, updatedAt: new Date() })
    .where(and(eq(lots.id, lotId), eq(lots.farmId, session.farmId)));

  revalidatePath("/rebanho");
}

// ---------- Animals ----------
export async function createAnimalAction(formData: FormData) {
  const session = await farmSession();
  const tag = str(formData.get("tag"));
  const sex = str(formData.get("sex")) as "macho" | "femea";
  if (!tag || !sex) return;

  const birthDateStr = optStr(formData.get("birthDate"));
  const birthDate = birthDateStr ? new Date(birthDateStr) : null;
  const birthWeightKg = optNum(formData.get("birthWeightKg"));

  await db.transaction(async (tx) => {
    const [newAnimal] = await tx
      .insert(animals)
      .values({
        farmId: session.farmId,
        tag,
        name: optStr(formData.get("name")),
        breedId: optStr(formData.get("breedId")),
        sex,
        isPO: formData.get("isPO") === "on",
        pedigreeNumber: optStr(formData.get("pedigreeNumber")),
        fatherId: optStr(formData.get("fatherId")),
        motherId: optStr(formData.get("motherId")),
        lotId: optStr(formData.get("lotId")),
        birthDate,
        updatedBy: session.userId,
      })
      .returning({ id: animals.id });

    // Peso ao nascer vira a primeira pesagem do histórico do animal — é a partir
    // daí (e das pesagens seguintes) que o GPD é calculado na aba Pesagem.
    if (birthWeightKg != null && birthWeightKg > 0) {
      await tx.insert(weighings).values({
        farmId: session.farmId,
        animalId: newAnimal.id,
        weightKg: birthWeightKg,
        weighedAt: birthDate ?? new Date(),
        notes: "Peso ao nascer",
        updatedBy: session.userId,
      });
    }
  });

  revalidatePath("/rebanho");
  revalidatePath("/pesagem");
  redirect("/rebanho");
}

export async function updateAnimalAction(formData: FormData) {
  const session = await farmSession();
  const animalId = str(formData.get("animalId"));
  const tag = str(formData.get("tag"));
  const sex = str(formData.get("sex")) as "macho" | "femea";
  if (!animalId || !tag || !sex) return;

  await db
    .update(animals)
    .set({
      tag,
      name: optStr(formData.get("name")),
      breedId: optStr(formData.get("breedId")),
      sex,
      isPO: formData.get("isPO") === "on",
      pedigreeNumber: optStr(formData.get("pedigreeNumber")),
      fatherId: optStr(formData.get("fatherId")),
      motherId: optStr(formData.get("motherId")),
      lotId: optStr(formData.get("lotId")),
      birthDate: optStr(formData.get("birthDate"))
        ? new Date(str(formData.get("birthDate")))
        : null,
      updatedBy: session.userId,
      updatedAt: new Date(),
    })
    .where(and(eq(animals.id, animalId), eq(animals.farmId, session.farmId)));

  revalidatePath("/rebanho");
  revalidatePath(`/rebanho/animais/${animalId}`);
}

/** Dar baixa por óbito — motivo é obrigatório. Reduz o lote vinculado, se houver. */
export async function registerDeathAction(formData: FormData) {
  const session = await farmSession();
  const animalId = str(formData.get("animalId"));
  const reason = str(formData.get("reason"));
  if (!animalId || !reason) return;

  const animal = await db.query.animals.findFirst({
    where: and(eq(animals.id, animalId), eq(animals.farmId, session.farmId)),
  });
  if (!animal || animal.status !== "ativo") return;

  await db.transaction(async (tx) => {
    await tx
      .update(animals)
      .set({
        status: "morto",
        statusReason: reason,
        statusChangedAt: new Date(),
        updatedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(animals.id, animalId));

    await tx.insert(mortalityEvents).values({
      farmId: session.farmId,
      animalId,
      lotId: animal.lotId,
      quantity: 1,
      reason,
      updatedBy: session.userId,
    });

    if (animal.lotId) {
      await tx
        .update(lots)
        .set({ quantity: sql`greatest(${lots.quantity} - 1, 0)`, updatedAt: new Date() })
        .where(eq(lots.id, animal.lotId));
    }
  });

  revalidatePath("/rebanho");
  revalidatePath(`/rebanho/animais/${animalId}`);
}

/** Reverte a baixa (reativa o animal) — cobre "excluir óbito reativa o animal". */
export async function reactivateAnimalAction(formData: FormData) {
  const session = await farmSession();
  const animalId = str(formData.get("animalId"));
  if (!animalId) return;

  const animal = await db.query.animals.findFirst({
    where: and(eq(animals.id, animalId), eq(animals.farmId, session.farmId)),
  });
  if (!animal || animal.status === "ativo") return;

  await db.transaction(async (tx) => {
    const wasMorto = animal.status === "morto";

    await tx
      .update(animals)
      .set({
        status: "ativo",
        statusReason: null,
        statusChangedAt: null,
        updatedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(animals.id, animalId));

    if (wasMorto) {
      const lastDeath = await tx.query.mortalityEvents.findFirst({
        where: eq(mortalityEvents.animalId, animalId),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });
      if (lastDeath) {
        await tx.delete(mortalityEvents).where(eq(mortalityEvents.id, lastDeath.id));
        if (animal.lotId) {
          await tx
            .update(lots)
            .set({ quantity: sql`${lots.quantity} + 1`, updatedAt: new Date() })
            .where(eq(lots.id, animal.lotId));
        }
      }
    }
  });

  revalidatePath("/rebanho");
  revalidatePath(`/rebanho/animais/${animalId}`);
}
