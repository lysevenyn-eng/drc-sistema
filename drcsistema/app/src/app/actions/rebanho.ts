"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, or, sql, isNull } from "drizzle-orm";
import { requireSession, requireAdmin } from "@/lib/session";
import { db } from "@/db";
import {
  animals,
  lots,
  breeds,
  mortalityEvents,
  abateEvents,
  lotTransfers,
  weighings,
  reproductionEvents,
} from "@/db/schema";

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

/**
 * Atualização manual do peso médio do lote — ex.: depois de pesar uma amostra
 * numa balança de lote. Sobrescreve direto, sem cálculo (mesmo padrão do
 * saldo manual da Carteira) — complementa a média ponderada que já acontece
 * automaticamente quando uma compra por lote informa peso.
 */
export async function updateLotAvgWeightAction(formData: FormData) {
  const session = await farmSession();
  const lotId = str(formData.get("lotId"));
  if (!lotId) return;

  await db
    .update(lots)
    .set({ avgWeightKg: optNum(formData.get("avgWeightKg")), updatedBy: session.userId, updatedAt: new Date() })
    .where(and(eq(lots.id, lotId), eq(lots.farmId, session.farmId)));

  revalidatePath("/rebanho");
}

/**
 * Move cabeças de um lote pra outro — ex.: separar lotes de confinamento a
 * partir de um lote maior. De um animal específico (kind = "individual": dá
 * baixa 1 no lote de origem, sobe 1 no de destino, e atualiza o lotId do
 * próprio animal) ou de N cabeças sem identificar quais (kind = "lote",
 * padrão default — mesma lógica de abate/óbito em lote). Diferente de
 * abate/óbito, não é uma baixa do rebanho — só uma realocação interna — então
 * acontece direto, sem pendência pra ninguém confirmar depois.
 */
export async function transferLotAction(formData: FormData) {
  const session = await farmSession();
  const kind = str(formData.get("kind")) || "lote";
  const toLotId = str(formData.get("toLotId"));
  const notes = optStr(formData.get("notes"));
  const eventDateStr = optStr(formData.get("eventDate"));
  const eventDate = eventDateStr ? new Date(eventDateStr) : new Date();
  if (!toLotId) return;

  const toLot = await db.query.lots.findFirst({
    where: and(eq(lots.id, toLotId), eq(lots.farmId, session.farmId)),
  });
  if (!toLot) return;

  if (kind === "individual") {
    const animalId = str(formData.get("animalId"));
    if (!animalId) return;

    const animal = await db.query.animals.findFirst({
      where: and(eq(animals.id, animalId), eq(animals.farmId, session.farmId)),
    });
    if (!animal || animal.status !== "ativo" || !animal.lotId || animal.lotId === toLotId) return;

    const fromLotId = animal.lotId;

    await db.transaction(async (tx) => {
      await tx
        .update(animals)
        .set({ lotId: toLotId, updatedBy: session.userId, updatedAt: new Date() })
        .where(eq(animals.id, animalId));

      await tx
        .update(lots)
        .set({ quantity: sql`greatest(${lots.quantity} - 1, 0)`, updatedAt: new Date() })
        .where(eq(lots.id, fromLotId));

      await tx
        .update(lots)
        .set({ quantity: sql`${lots.quantity} + 1`, updatedAt: new Date() })
        .where(eq(lots.id, toLotId));

      await tx.insert(lotTransfers).values({
        farmId: session.farmId,
        animalId,
        fromLotId,
        toLotId,
        quantity: 1,
        eventDate,
        notes,
        updatedBy: session.userId,
      });
    });

    revalidatePath("/rebanho");
    revalidatePath(`/rebanho/animais/${animalId}`);
    return;
  }

  const fromLotId = str(formData.get("fromLotId"));
  const quantity = optNum(formData.get("quantity"));
  if (!fromLotId || !quantity || quantity <= 0 || fromLotId === toLotId) return;

  const fromLot = await db.query.lots.findFirst({
    where: and(eq(lots.id, fromLotId), eq(lots.farmId, session.farmId)),
  });
  if (!fromLot || quantity > fromLot.quantity) return;

  await db.transaction(async (tx) => {
    await tx
      .update(lots)
      .set({ quantity: sql`greatest(${lots.quantity} - ${quantity}, 0)`, updatedAt: new Date() })
      .where(eq(lots.id, fromLotId));

    await tx
      .update(lots)
      .set({ quantity: sql`${lots.quantity} + ${quantity}`, updatedAt: new Date() })
      .where(eq(lots.id, toLotId));

    await tx.insert(lotTransfers).values({
      farmId: session.farmId,
      animalId: null,
      fromLotId,
      toLotId,
      quantity,
      eventDate,
      notes,
      updatedBy: session.userId,
    });
  });

  revalidatePath("/rebanho");
}

/**
 * Desfaz uma mudança de lote — devolve a quantidade ao lote de origem e tira
 * do lote de destino. No caso individual, só reverte o lotId do animal se ele
 * ainda estiver no lote de destino desta transferência (se já foi movido de
 * novo depois, não mexe — evita desfazer uma mudança mais recente por
 * engano). Admin-only, mesmo padrão das outras exclusões de eventos em lote.
 */
export async function deleteLotTransferAction(formData: FormData) {
  const session = await requireAdmin();
  if (!session.farmId) return;
  const eventId = str(formData.get("eventId"));
  if (!eventId) return;

  const event = await db.query.lotTransfers.findFirst({
    where: and(eq(lotTransfers.id, eventId), eq(lotTransfers.farmId, session.farmId)),
  });
  if (!event) return;

  await db.transaction(async (tx) => {
    if (event.animalId) {
      const animal = await tx.query.animals.findFirst({ where: eq(animals.id, event.animalId) });
      if (animal && animal.lotId === event.toLotId) {
        await tx
          .update(animals)
          .set({ lotId: event.fromLotId, updatedBy: session.userId, updatedAt: new Date() })
          .where(eq(animals.id, event.animalId));
      }
    }
    if (event.toLotId) {
      await tx
        .update(lots)
        .set({ quantity: sql`greatest(${lots.quantity} - ${event.quantity}, 0)`, updatedAt: new Date() })
        .where(eq(lots.id, event.toLotId));
    }
    if (event.fromLotId) {
      await tx
        .update(lots)
        .set({ quantity: sql`${lots.quantity} + ${event.quantity}`, updatedAt: new Date() })
        .where(eq(lots.id, event.fromLotId));
    }
    await tx.delete(lotTransfers).where(eq(lotTransfers.id, eventId));
  });

  revalidatePath("/rebanho");
  if (event.animalId) revalidatePath(`/rebanho/animais/${event.animalId}`);
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

  // Pai: um animal cadastrado (fatherId) OU um reprodutor externo digitado
  // (externalFatherName, ex.: sêmen de fora numa I.A.) — nunca os dois
  // juntos, ver FatherField (componente do form).
  const fatherMode = str(formData.get("fatherMode"));
  const fatherId = fatherMode === "externo" ? null : optStr(formData.get("fatherId"));
  const externalFatherName = fatherMode === "externo" ? optStr(formData.get("externalFatherName")) : null;
  const breedingMethod = optStr(formData.get("breedingMethod")) as
    | "monta_natural"
    | "inseminacao_artificial"
    | null;

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
        fatherId,
        externalFatherName,
        breedingMethod,
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

  const fatherMode = str(formData.get("fatherMode"));
  const fatherId = fatherMode === "externo" ? null : optStr(formData.get("fatherId"));
  const externalFatherName = fatherMode === "externo" ? optStr(formData.get("externalFatherName")) : null;
  const breedingMethod = optStr(formData.get("breedingMethod")) as
    | "monta_natural"
    | "inseminacao_artificial"
    | null;

  await db
    .update(animals)
    .set({
      tag,
      name: optStr(formData.get("name")),
      breedId: optStr(formData.get("breedId")),
      sex,
      isPO: formData.get("isPO") === "on",
      pedigreeNumber: optStr(formData.get("pedigreeNumber")),
      fatherId,
      externalFatherName,
      breedingMethod,
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

/**
 * Dar baixa por óbito — de um animal cadastrado individualmente ou de N
 * cabeças de um lote de uma vez (kind = "lote", sem apontar quais
 * exatamente — mesma lógica de venda por lote: o lote não rastreia animal
 * por animal). O motivo é obrigatório só quando quem registra é admin —
 * nesse caso não tem mais ninguém pra confirmar depois, então já entra
 * confirmado. Quando é o cabanheiro ou o criador (ex.: pela tela
 * /abates-obitos), o motivo é opcional e o registro fica pendente até um
 * admin confirmar (ver confirmDeathReasonAction). Reduz o lote vinculado
 * imediatamente — a baixa em si não espera confirmação, só o motivo.
 */
export async function registerDeathAction(formData: FormData) {
  const session = await farmSession();
  const kind = str(formData.get("kind")) || "individual";
  const reason = optStr(formData.get("reason"));
  const isAdmin = session.role === "admin";
  if (isAdmin && !reason) return;

  if (kind === "lote") {
    const lotId = str(formData.get("lotId"));
    const quantity = optNum(formData.get("quantity"));
    if (!lotId || !quantity || quantity <= 0) return;

    const lot = await db.query.lots.findFirst({
      where: and(eq(lots.id, lotId), eq(lots.farmId, session.farmId)),
    });
    if (!lot || quantity > lot.quantity) return;

    await db.transaction(async (tx) => {
      await tx.insert(mortalityEvents).values({
        farmId: session.farmId,
        animalId: null,
        lotId,
        quantity,
        reason,
        confirmedAt: isAdmin ? new Date() : null,
        updatedBy: session.userId,
      });

      await tx
        .update(lots)
        .set({ quantity: sql`greatest(${lots.quantity} - ${quantity}, 0)`, updatedAt: new Date() })
        .where(eq(lots.id, lotId));
    });

    revalidatePath("/rebanho");
    revalidatePath("/abates-obitos");
    revalidatePath("/dashboard");
    return;
  }

  const animalId = str(formData.get("animalId"));
  if (!animalId) return;

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
      confirmedAt: isAdmin ? new Date() : null,
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
  revalidatePath("/abates-obitos");
  revalidatePath("/dashboard");
}

/**
 * Exclui um óbito registrado em lote (não tem animal específico pra
 * reativar — ver reactivateAnimalAction para o caso individual). Devolve a
 * quantidade ao lote. Admin-only.
 */
export async function deleteLotMortalityEventAction(formData: FormData) {
  const session = await requireAdmin();
  if (!session.farmId) return;
  const eventId = str(formData.get("eventId"));
  if (!eventId) return;

  const event = await db.query.mortalityEvents.findFirst({
    where: and(eq(mortalityEvents.id, eventId), eq(mortalityEvents.farmId, session.farmId)),
  });
  if (!event || event.animalId) return; // só cobre o caso em lote

  await db.transaction(async (tx) => {
    await tx.delete(mortalityEvents).where(eq(mortalityEvents.id, eventId));
    if (event.lotId) {
      await tx
        .update(lots)
        .set({ quantity: sql`${lots.quantity} + ${event.quantity}`, updatedAt: new Date() })
        .where(eq(lots.id, event.lotId));
    }
  });

  revalidatePath("/rebanho");
  revalidatePath("/abates-obitos");
  revalidatePath("/dashboard");
}

/** Admin confirma o motivo definitivo de um óbito registrado por outra pessoa (fica pendente até então). */
export async function confirmDeathReasonAction(formData: FormData) {
  const session = await requireAdmin();
  if (!session.farmId) return;
  const eventId = str(formData.get("eventId"));
  const reason = str(formData.get("reason"));
  if (!eventId || !reason) return;

  const event = await db.query.mortalityEvents.findFirst({
    where: and(eq(mortalityEvents.id, eventId), eq(mortalityEvents.farmId, session.farmId)),
  });
  if (!event) return;

  await db.transaction(async (tx) => {
    await tx
      .update(mortalityEvents)
      .set({ reason, confirmedAt: new Date(), updatedBy: session.userId, updatedAt: new Date() })
      .where(eq(mortalityEvents.id, eventId));

    if (event.animalId) {
      await tx
        .update(animals)
        .set({ statusReason: reason, updatedAt: new Date() })
        .where(eq(animals.id, event.animalId));
    }
  });

  revalidatePath("/abates-obitos");
  revalidatePath("/rebanho");
  revalidatePath("/dashboard");
  if (event.animalId) revalidatePath(`/rebanho/animais/${event.animalId}`);
}

/**
 * Edita um óbito já registrado — motivo, data e (em lote) a quantidade.
 * Mesma abertura de quem registra: qualquer um edita enquanto não
 * confirmado; depois de confirmado, só admin. Quando quem edita é admin e o
 * óbito ainda não tinha confirmedAt, a edição já confirma (mesma regra do
 * registro em registerDeathAction). Em lote, se a nova quantidade não couber
 * no saldo do lote, é ignorada mas o resto da edição segue normalmente.
 */
export async function updateMortalityEventAction(formData: FormData) {
  const session = await farmSession();
  const eventId = str(formData.get("eventId"));
  if (!eventId) return;

  const event = await db.query.mortalityEvents.findFirst({
    where: and(eq(mortalityEvents.id, eventId), eq(mortalityEvents.farmId, session.farmId)),
  });
  if (!event) return;

  const isAdmin = session.role === "admin";
  if (event.confirmedAt && !isAdmin) return;

  const reason = optStr(formData.get("reason"));
  if (isAdmin && !reason) return;
  const eventDateStr = optStr(formData.get("eventDate"));
  const eventDate = eventDateStr ? new Date(eventDateStr) : event.eventDate;

  const isLote = !event.animalId;
  const requestedQuantity = isLote ? optNum(formData.get("quantity")) : null;
  const delta = requestedQuantity != null && requestedQuantity > 0 ? requestedQuantity - event.quantity : 0;

  await db.transaction(async (tx) => {
    let finalQuantity = event.quantity;
    if (isLote && delta !== 0 && event.lotId) {
      const lot = await tx.query.lots.findFirst({ where: eq(lots.id, event.lotId) });
      if (lot && delta <= lot.quantity) {
        await tx
          .update(lots)
          .set({ quantity: sql`${lots.quantity} - ${delta}`, updatedAt: new Date() })
          .where(eq(lots.id, event.lotId));
        finalQuantity = requestedQuantity as number;
      }
    }

    await tx
      .update(mortalityEvents)
      .set({
        quantity: finalQuantity,
        reason,
        confirmedAt: isAdmin ? event.confirmedAt ?? new Date() : event.confirmedAt,
        eventDate,
        updatedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(mortalityEvents.id, eventId));

    if (event.animalId && reason) {
      await tx
        .update(animals)
        .set({ statusReason: reason, updatedAt: new Date() })
        .where(eq(animals.id, event.animalId));
    }
  });

  revalidatePath("/abates-obitos");
  revalidatePath("/rebanho");
  revalidatePath("/dashboard");
  if (event.animalId) revalidatePath(`/rebanho/animais/${event.animalId}`);
  redirect("/abates-obitos");
}

/**
 * Registrar abate — normalmente pelo cabanheiro, na tela /abates-obitos. De
 * um animal cadastrado individualmente (dá baixa nele, status "abatido") ou
 * de N cabeças de um lote de uma vez (kind = "lote", sem apontar quais
 * exatamente — mesmo padrão de venda por lote e de óbito em lote acima).
 *
 * Um abate individual fica pendente (saleId nulo) até o admin registrar a
 * venda em Compras e vendas (ver createSaleAction, que resolve a pendência
 * vinculando abateEvents.saleId). Um abate em lote não tem um animal
 * específico pra vincular a uma venda só — fica pendente até o admin marcar
 * como resolvido manualmente, depois de lançar a(s) venda(s) normalmente
 * (ver resolveAbateEventAction).
 *
 * Peso de carcaça é opcional aqui (total do lote, no caso em lote) — quem
 * bate na balança nem sempre é quem registra, dá pra completar depois.
 */
export async function registerAbateAction(formData: FormData) {
  const session = await farmSession();
  const kind = str(formData.get("kind")) || "individual";
  const carcassWeightKg = optNum(formData.get("carcassWeightKg"));
  const liveWeightKg = optNum(formData.get("liveWeightKg"));
  const notes = optStr(formData.get("notes"));
  const eventDateStr = optStr(formData.get("eventDate"));
  const eventDate = eventDateStr ? new Date(eventDateStr) : new Date();

  if (kind === "lote") {
    const lotId = str(formData.get("lotId"));
    const quantity = optNum(formData.get("quantity"));
    if (!lotId || !quantity || quantity <= 0) return;

    const lot = await db.query.lots.findFirst({
      where: and(eq(lots.id, lotId), eq(lots.farmId, session.farmId)),
    });
    if (!lot || quantity > lot.quantity) return;

    await db.transaction(async (tx) => {
      await tx.insert(abateEvents).values({
        farmId: session.farmId,
        animalId: null,
        lotId,
        quantity,
        carcassWeightKg,
        liveWeightKg,
        eventDate,
        notes,
        updatedBy: session.userId,
      });

      await tx
        .update(lots)
        .set({ quantity: sql`greatest(${lots.quantity} - ${quantity}, 0)`, updatedAt: new Date() })
        .where(eq(lots.id, lotId));
    });

    revalidatePath("/rebanho");
    revalidatePath("/abates-obitos");
    revalidatePath("/dashboard");
    return;
  }

  const animalId = str(formData.get("animalId"));
  if (!animalId) return;

  const animal = await db.query.animals.findFirst({
    where: and(eq(animals.id, animalId), eq(animals.farmId, session.farmId)),
  });
  if (!animal || animal.status !== "ativo") return;

  await db.transaction(async (tx) => {
    await tx
      .update(animals)
      .set({
        status: "abatido",
        statusChangedAt: new Date(),
        updatedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(animals.id, animalId));

    await tx.insert(abateEvents).values({
      farmId: session.farmId,
      animalId,
      lotId: animal.lotId,
      carcassWeightKg,
      liveWeightKg,
      eventDate,
      notes,
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
  revalidatePath("/abates-obitos");
  revalidatePath("/dashboard");
}

/**
 * Edita um abate já registrado — peso, data, observações e (em lote) a
 * quantidade. Mesma abertura de quem registra: qualquer um edita enquanto
 * não resolvido (sem venda vinculada e sem resolvedAt); depois de resolvido,
 * só admin. Não dá pra mudar o animal/lote em si (excluir e lançar de novo
 * pra isso). Em lote, se a nova quantidade não couber no saldo do lote, a
 * quantidade é ignorada mas o resto da edição (peso, data, observações)
 * segue normalmente.
 */
export async function updateAbateEventAction(formData: FormData) {
  const session = await farmSession();
  const eventId = str(formData.get("eventId"));
  if (!eventId) return;

  const event = await db.query.abateEvents.findFirst({
    where: and(eq(abateEvents.id, eventId), eq(abateEvents.farmId, session.farmId)),
  });
  if (!event) return;

  const isAdmin = session.role === "admin";
  const resolved = !!event.saleId || !!event.resolvedAt;
  if (resolved && !isAdmin) return;

  const carcassWeightKg = optNum(formData.get("carcassWeightKg"));
  const liveWeightKg = optNum(formData.get("liveWeightKg"));
  const notes = optStr(formData.get("notes"));
  const eventDateStr = optStr(formData.get("eventDate"));
  const eventDate = eventDateStr ? new Date(eventDateStr) : event.eventDate;

  const isLote = !event.animalId;
  const requestedQuantity = isLote ? optNum(formData.get("quantity")) : null;
  const delta = requestedQuantity != null && requestedQuantity > 0 ? requestedQuantity - event.quantity : 0;

  await db.transaction(async (tx) => {
    let finalQuantity = event.quantity;
    if (isLote && delta !== 0 && event.lotId) {
      const lot = await tx.query.lots.findFirst({ where: eq(lots.id, event.lotId) });
      if (lot && delta <= lot.quantity) {
        await tx
          .update(lots)
          .set({ quantity: sql`${lots.quantity} - ${delta}`, updatedAt: new Date() })
          .where(eq(lots.id, event.lotId));
        finalQuantity = requestedQuantity as number;
      }
    }

    await tx
      .update(abateEvents)
      .set({
        quantity: finalQuantity,
        carcassWeightKg,
        liveWeightKg,
        eventDate,
        notes,
        updatedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(abateEvents.id, eventId));
  });

  revalidatePath("/abates-obitos");
  revalidatePath("/rebanho");
  revalidatePath("/dashboard");
  if (event.animalId) revalidatePath(`/rebanho/animais/${event.animalId}`);
  redirect("/abates-obitos");
}

/**
 * Admin marca um abate em lote como resolvido (venda já lançada normalmente
 * em Compras e vendas — sem vínculo automático com uma venda específica,
 * diferente do abate individual, porque um abate em lote não aponta pra
 * animais específicos pra casar 1:1 com uma linha de venda). Só muda
 * resolvedAt — não cria nem vincula venda nenhuma; se for clicado sem uma
 * venda ter sido lançada de verdade, ver reopenAbateEventAction pra desfazer.
 */
export async function resolveAbateEventAction(formData: FormData) {
  const session = await requireAdmin();
  if (!session.farmId) return;
  const eventId = str(formData.get("eventId"));
  if (!eventId) return;

  await db
    .update(abateEvents)
    .set({ resolvedAt: new Date(), updatedBy: session.userId, updatedAt: new Date() })
    .where(and(eq(abateEvents.id, eventId), eq(abateEvents.farmId, session.farmId), isNull(abateEvents.animalId)));

  revalidatePath("/abates-obitos");
  revalidatePath("/dashboard");
}

/**
 * Desfaz um "Marcar como vendido" clicado sem uma venda ter sido lançada de
 * verdade (só existe pra abate em lote — resolveAbateEventAction nunca
 * mexe no individual, esse só resolve de verdade quando createSaleAction
 * vincula o saleId). Depois de reaberto, "Ir para nova venda" e "Excluir"
 * voltam a aparecer pro abate. Seguro reverter mesmo se já existir uma
 * venda lançada por fora (à mão, sem passar pela ponte "Ir para nova
 * venda") — reabrir não mexe em nenhuma venda já lançada, só no rótulo
 * "vendido" deste registro de abate.
 */
export async function reopenAbateEventAction(formData: FormData) {
  const session = await requireAdmin();
  if (!session.farmId) return;
  const eventId = str(formData.get("eventId"));
  if (!eventId) return;

  await db
    .update(abateEvents)
    .set({ resolvedAt: null, updatedBy: session.userId, updatedAt: new Date() })
    .where(and(eq(abateEvents.id, eventId), eq(abateEvents.farmId, session.farmId), isNull(abateEvents.animalId)));

  revalidatePath("/abates-obitos");
  revalidatePath("/dashboard");
}

/**
 * Exclui um abate registrado em lote ainda não resolvido — devolve a
 * quantidade ao lote. Não cobre o caso individual (ver reactivateAnimalAction)
 * nem um abate em lote já marcado como resolvido (ver resolveAbateEventAction).
 * Admin-only.
 */
export async function deleteLotAbateEventAction(formData: FormData) {
  const session = await requireAdmin();
  if (!session.farmId) return;
  const eventId = str(formData.get("eventId"));
  if (!eventId) return;

  const event = await db.query.abateEvents.findFirst({
    where: and(eq(abateEvents.id, eventId), eq(abateEvents.farmId, session.farmId)),
  });
  if (!event || event.animalId || event.resolvedAt) return;

  await db.transaction(async (tx) => {
    await tx.delete(abateEvents).where(eq(abateEvents.id, eventId));
    if (event.lotId) {
      await tx
        .update(lots)
        .set({ quantity: sql`${lots.quantity} + ${event.quantity}`, updatedAt: new Date() })
        .where(eq(lots.id, event.lotId));
    }
  });

  revalidatePath("/rebanho");
  revalidatePath("/abates-obitos");
  revalidatePath("/dashboard");
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
    const wasAbatido = animal.status === "abatido";

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

    // Abate ainda não vendido (saleId nulo) — desfaz igual ao óbito acima. Um
    // abate já vinculado a uma venda não chega aqui: nesse caso o status já é
    // "vendido", não "abatido" (ver createSaleAction), e a forma de desfazer é
    // excluir a venda em Compras e vendas.
    if (wasAbatido) {
      const lastAbate = await tx.query.abateEvents.findFirst({
        where: and(eq(abateEvents.animalId, animalId), isNull(abateEvents.saleId)),
        orderBy: (e, { desc }) => [desc(e.createdAt)],
      });
      if (lastAbate) {
        await tx.delete(abateEvents).where(eq(abateEvents.id, lastAbate.id));
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
  revalidatePath("/abates-obitos");
  revalidatePath("/dashboard");
}

// ---------- Exclusão de dados ----------
/** Exclui um lote definitivamente. Animais vinculados ficam sem lote (não são excluídos). */
export async function deleteLotAction(formData: FormData) {
  const session = await requireAdmin();
  if (!session.farmId) return;
  const lotId = str(formData.get("lotId"));
  if (!lotId) return;

  await db.delete(lots).where(and(eq(lots.id, lotId), eq(lots.farmId, session.farmId)));
  revalidatePath("/rebanho");
}

/**
 * Exclusão definitiva do animal. Bloqueada se ele for pai/mãe de outro animal já
 * cadastrado ou aparecer em algum evento de reprodução — nesses casos o histórico
 * depende dele, então a pessoa é levada de volta à ficha do animal com uma
 * explicação. Para um animal que morreu ou saiu do rebanho, "Registrar óbito" é o
 * caminho certo, não excluir.
 */
export async function deleteAnimalAction(formData: FormData) {
  const session = await requireAdmin();
  if (!session.farmId) return;
  const animalId = str(formData.get("animalId"));
  if (!animalId) return;

  const animal = await db.query.animals.findFirst({
    where: and(eq(animals.id, animalId), eq(animals.farmId, session.farmId)),
  });
  if (!animal) return;

  const [parentOf, reproLink] = await Promise.all([
    db.query.animals.findFirst({
      where: and(
        eq(animals.farmId, session.farmId),
        or(eq(animals.motherId, animalId), eq(animals.fatherId, animalId))
      ),
    }),
    db.query.reproductionEvents.findFirst({
      where: and(
        eq(reproductionEvents.farmId, session.farmId),
        or(
          eq(reproductionEvents.motherId, animalId),
          eq(reproductionEvents.fatherId, animalId),
          eq(reproductionEvents.offspringAnimalId, animalId)
        )
      ),
    }),
  ]);

  if (parentOf || reproLink) {
    redirect(`/rebanho/animais/${animalId}?deleteError=vinculado`);
  }

  await db.delete(animals).where(and(eq(animals.id, animalId), eq(animals.farmId, session.farmId)));

  revalidatePath("/rebanho");
  redirect("/rebanho");
}
