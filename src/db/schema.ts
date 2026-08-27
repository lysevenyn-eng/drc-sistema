import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const uuid = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// ---------- Enums ----------
export const roleEnum = pgEnum("role", ["admin", "criador", "caseiro"]);
export const userStatusEnum = pgEnum("user_status", ["pendente", "aprovado", "rejeitado"]);
export const sexEnum = pgEnum("sex", ["macho", "femea"]);
export const compositionEnum = pgEnum("composition", ["macho", "femea", "misto"]);
export const animalStatusEnum = pgEnum("animal_status", ["ativo", "vendido", "morto"]);
export const lotStatusEnum = pgEnum("lot_status", ["ativo", "encerrado"]);
export const reproEventTypeEnum = pgEnum("repro_event_type", [
  "cobertura",
  "diagnostico_gestacao",
  "parto",
  "desmame",
  "obito",
]);
export const taskTypeEnum = pgEnum("task_type", [
  "vacina",
  "vermifugo",
  "medicamento",
  "casqueamento",
  "desmame",
  "pesagem",
  "outro",
]);
export const taskTargetEnum = pgEnum("task_target", ["animal", "lote"]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "medicamento_vacina",
  "inseminacao",
  "gta",
  "alimentacao",
  "frete",
  "outras",
]);
export const breedingMethodEnum = pgEnum("breeding_method", [
  "monta_natural",
  "inseminacao_artificial",
  "transferencia_embriao",
]);
export const saleTypeEnum = pgEnum("sale_type", ["lote", "individual"]);
export const saleModeEnum = pgEnum("sale_mode", ["vivo_cabeca", "vivo_peso", "carcaca", "outra"]);
export const walletAccountTypeEnum = pgEnum("wallet_account_type", ["dinheiro", "banco"]);

// ---------- Tenants & Auth ----------
export const farms = pgTable("farms", {
  id: uuid(),
  name: text("name").notNull(),
  instagram: text("instagram"),
  ...timestamps,
});

export const users = pgTable(
  "users",
  {
    id: uuid(),
    farmId: text("farm_id").references(() => farms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    // Nulo = pré-cadastro feito por um admin (ver preRegisterUserAction) que a
    // pessoa ainda não completou. Ela "ativa" a conta passando pelo /register
    // com o mesmo e-mail: registerAction detecta o pré-cadastro e só preenche
    // a senha, mantendo o farmId/role/status que o admin já definiu.
    passwordHash: text("password_hash"),
    role: roleEnum("role").notNull().default("criador"),
    status: userStatusEnum("status").notNull().default("pendente"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

// ---------- Reference data ----------
export const breeds = pgTable("breeds", {
  id: uuid(),
  farmId: text("farm_id").references(() => farms.id, { onDelete: "cascade" }), // null = padrão global
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// ---------- Rebanho ----------
export const lots = pgTable("lots", {
  id: uuid(),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  breedId: text("breed_id").references(() => breeds.id),
  composition: compositionEnum("composition").notNull().default("misto"),
  quantity: integer("quantity").notNull().default(0),
  costPerHead: numeric("cost_per_head", { precision: 12, scale: 2, mode: "number" }),
  // Peso médio por cabeça (kg) — alimentado por compras que informam peso (média
  // ponderada, igual costPerHead) e/ou atualizado manualmente (ex.: depois de
  // pesar uma amostra do lote). Animais de lote não são cadastrados individualmente,
  // então não têm pesagem própria — este é o único jeito de acompanhar peso do lote.
  avgWeightKg: numeric("avg_weight_kg", { precision: 6, scale: 2, mode: "number" }),
  status: lotStatusEnum("status").notNull().default("ativo"),
  notes: text("notes"),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

export const animals = pgTable(
  "animals",
  {
    id: uuid(),
    farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
    name: text("name"),
    tag: text("tag").notNull(), // brinco/código
    breedId: text("breed_id").references(() => breeds.id),
    sex: sexEnum("sex").notNull(),
    isPO: boolean("is_po").notNull().default(false),
    pedigreeNumber: text("pedigree_number"),
    fatherId: text("father_id"),
    // Reprodutor externo (sêmen de fora, ex.: I.A. com touro que não é da
    // fazenda) — alternativa a fatherId quando não há um animal cadastrado
    // pra apontar. Os dois são preenchidos pelo mesmo campo no formulário
    // (FatherField), nunca os dois juntos. Mesmo padrão em reproductionEvents.
    externalFatherName: text("external_father_name"),
    // Método de concepção deste animal (monta natural x inseminação artificial),
    // opcional/histórico — nulo = não informado. Ver mesmo campo em reproductionEvents.
    breedingMethod: breedingMethodEnum("breeding_method"),
    motherId: text("mother_id"),
    lotId: text("lot_id").references(() => lots.id, { onDelete: "set null" }),
    status: animalStatusEnum("status").notNull().default("ativo"),
    birthDate: timestamp("birth_date", { withTimezone: true }),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
    // Custo de aquisição só quando o animal foi comprado individualmente (ver
    // compras-vendas.ts / createPurchaseAction) — equivalente ao costPerHead de
    // um lote, mas por animal. Valor financeiro: nunca exibir fora de telas
    // admin-only (Compras e vendas), mesma regra do resto do módulo.
    acquisitionCost: numeric("acquisition_cost", { precision: 12, scale: 2, mode: "number" }),
    statusReason: text("status_reason"), // motivo obrigatório ao dar baixa (morte, etc.)
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    updatedBy: text("updated_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("animals_farm_tag_idx").on(t.farmId, t.tag)]
);

export const animalsRelations = relations(animals, ({ one, many }) => ({
  father: one(animals, { fields: [animals.fatherId], references: [animals.id], relationName: "father" }),
  mother: one(animals, { fields: [animals.motherId], references: [animals.id], relationName: "mother" }),
  lot: one(lots, { fields: [animals.lotId], references: [lots.id] }),
  breed: one(breeds, { fields: [animals.breedId], references: [breeds.id] }),
  weighings: many(weighings),
}));

export const lotsRelations = relations(lots, ({ one }) => ({
  breed: one(breeds, { fields: [lots.breedId], references: [breeds.id] }),
}));

// ---------- Reprodução e P.O. ----------
export const reproductionEvents = pgTable("reproduction_events", {
  id: uuid(),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  motherId: text("mother_id").notNull().references(() => animals.id),
  fatherId: text("father_id").references(() => animals.id),
  // Reprodutor externo (sêmen de fora) — preenchido no lugar de fatherId quando
  // o pai não é um animal cadastrado na fazenda (comum em I.A. com sêmen
  // comprado). Nunca os dois juntos; ver FatherField (componente do form).
  externalFatherName: text("external_father_name"),
  // Só relevante em eventType = "cobertura": como a cobertura foi feita.
  // Nulo = não informado (eventos antigos, antes deste campo existir).
  breedingMethod: breedingMethodEnum("breeding_method"),
  // Só relevante quando breedingMethod = "transferencia_embriao": motherId
  // continua sendo a receptora (quem carrega e pare a cria — não muda nada
  // no resto do sistema). donorMotherId/externalDonorName guardam a mãe
  // genética (doadora do embrião), separadamente. Mesmo padrão cadastrado x
  // externo do fatherId/externalFatherName, ver DonorMotherField.
  donorMotherId: text("donor_mother_id").references(() => animals.id),
  externalDonorName: text("external_donor_name"),
  eventType: reproEventTypeEnum("event_type").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull().defaultNow(),
  // Parto: total de filhotes e quantos nasceram vivos (a diferença = natimortos).
  offspringCount: integer("offspring_count"),
  liveCount: integer("live_count"),
  // Diagnóstico de gestação: resultado (true = positivo, false = negativo).
  pregnant: boolean("pregnant"),
  // Diagnóstico de gestação (só quando pregnant = true): nº de fetos, se já souber
  // (ex.: ultrassom) — >=2 marca "gemelar" no relatório de reprodução, antes mesmo
  // do parto confirmar (que também marca gemelar sozinho, via offspringCount).
  fetusCount: integer("fetus_count"),
  // Só em eventos do tipo "cobertura": marca que esse ciclo foi encerrado sem
  // diagnóstico/parto/óbito (ex.: matriz vendida, desistiu de acompanhar) — tira
  // a cobertura da lista de "aguardando resultado" no relatório de reprodução.
  closedWithoutResult: boolean("closed_without_result").notNull().default(false),
  // Desmame (e opcionalmente outros eventos): qual filhote já cadastrado o evento se refere.
  offspringAnimalId: text("offspring_animal_id").references(() => animals.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

export const reproductionEventsRelations = relations(reproductionEvents, ({ one }) => ({
  mother: one(animals, {
    fields: [reproductionEvents.motherId],
    references: [animals.id],
    relationName: "reproMother",
  }),
  father: one(animals, {
    fields: [reproductionEvents.fatherId],
    references: [animals.id],
    relationName: "reproFather",
  }),
  donorMother: one(animals, {
    fields: [reproductionEvents.donorMotherId],
    references: [animals.id],
    relationName: "reproDonorMother",
  }),
  offspringAnimal: one(animals, {
    fields: [reproductionEvents.offspringAnimalId],
    references: [animals.id],
    relationName: "reproOffspring",
  }),
}));

// ---------- Pesagem ----------
export const weighings = pgTable("weighings", {
  id: uuid(),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  animalId: text("animal_id").notNull().references(() => animals.id, { onDelete: "cascade" }),
  weightKg: numeric("weight_kg", { precision: 6, scale: 2, mode: "number" }).notNull(),
  weighedAt: timestamp("weighed_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

export const weighingsRelations = relations(weighings, ({ one }) => ({
  animal: one(animals, { fields: [weighings.animalId], references: [animals.id] }),
}));

// ---------- Manejo e tarefas / calendário ----------
export const managementTasks = pgTable("management_tasks", {
  id: uuid(),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  type: taskTypeEnum("type").notNull(),
  product: text("product"),
  dose: text("dose"),
  targetType: taskTargetEnum("target_type").notNull(),
  animalId: text("animal_id").references(() => animals.id, { onDelete: "cascade" }),
  lotId: text("lot_id").references(() => lots.id, { onDelete: "cascade" }),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }).notNull(),
  completedDate: timestamp("completed_date", { withTimezone: true }),
  notes: text("notes"),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

export const managementTasksRelations = relations(managementTasks, ({ one, many }) => ({
  animal: one(animals, { fields: [managementTasks.animalId], references: [animals.id] }),
  lot: one(lots, { fields: [managementTasks.lotId], references: [lots.id] }),
  assignees: many(managementTaskAssignees),
}));

// Responsáveis por uma tarefa de manejo — vários usuários podem compartilhar a
// mesma tarefa (substitui o antigo campo de texto livre "responsible").
export const managementTaskAssignees = pgTable(
  "management_task_assignees",
  {
    id: uuid(),
    taskId: text("task_id").notNull().references(() => managementTasks.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("task_assignee_idx").on(t.taskId, t.userId)]
);

export const managementTaskAssigneesRelations = relations(managementTaskAssignees, ({ one }) => ({
  task: one(managementTasks, { fields: [managementTaskAssignees.taskId], references: [managementTasks.id] }),
  user: one(users, { fields: [managementTaskAssignees.userId], references: [users.id] }),
}));

// ---------- Compras ----------
export const purchases = pgTable("purchases", {
  id: uuid(),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  lotId: text("lot_id").references(() => lots.id, { onDelete: "set null" }),
  // Preenchido só em compra individual (um animal só, não um lote) — ver
  // createPurchaseAction. lotId acima também pode estar preenchido junto,
  // se o animal já foi atribuído a um lote no momento da compra.
  animalId: text("animal_id").references(() => animals.id, { onDelete: "set null" }),
  description: text("description"),
  // Nome do fornecedor (texto livre) — usado principalmente quando a compra
  // gera contas a pagar (ver accountsPayable), mas fica disponível em
  // qualquer compra como referência.
  supplierName: text("supplier_name"),
  quantity: integer("quantity").notNull(),
  breedId: text("breed_id").references(() => breeds.id),
  composition: compositionEnum("composition").notNull().default("misto"),
  totalValue: numeric("total_value", { precision: 12, scale: 2, mode: "number" }).notNull(),
  // Peso total (kg) da compra por lote, opcional — usado pra entrar na média
  // ponderada de lots.avgWeightKg, mesmo padrão de totalValue/costPerHead.
  totalWeightKg: numeric("total_weight_kg", { precision: 8, scale: 2, mode: "number" }),
  purchaseDate: timestamp("purchase_date", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  lot: one(lots, { fields: [purchases.lotId], references: [lots.id] }),
  animal: one(animals, { fields: [purchases.animalId], references: [animals.id] }),
  breed: one(breeds, { fields: [purchases.breedId], references: [breeds.id] }),
  accountsPayable: many(accountsPayable),
}));

// ---------- Contas a pagar ----------
// Só existem vinculadas a uma compra parcelada (boleto/negociação) — ver
// createPurchaseAction. Um "informativo" por parcela, cada um com seu próprio
// vencimento, pra aparecer no calendário e em Financeiro. Admin-only, mesma
// regra do resto do módulo financeiro. Exclui em cascata se a compra for
// excluída (onDelete: cascade no purchaseId abaixo).
export const accountsPayable = pgTable("accounts_payable", {
  id: uuid(),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  purchaseId: text("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
  installmentNumber: integer("installment_number").notNull(),
  totalInstallments: integer("total_installments").notNull(),
  value: numeric("value", { precision: 12, scale: 2, mode: "number" }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  notes: text("notes"),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

export const accountsPayableRelations = relations(accountsPayable, ({ one }) => ({
  purchase: one(purchases, { fields: [accountsPayable.purchaseId], references: [purchases.id] }),
}));

// ---------- Despesas ----------
export const expenses = pgTable("expenses", {
  id: uuid(),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description"),
  value: numeric("value", { precision: 12, scale: 2, mode: "number" }).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  lotId: text("lot_id").references(() => lots.id, { onDelete: "set null" }),
  animalId: text("animal_id").references(() => animals.id, { onDelete: "set null" }),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  lot: one(lots, { fields: [expenses.lotId], references: [lots.id] }),
  animal: one(animals, { fields: [expenses.animalId], references: [animals.id] }),
}));

// ---------- Vendas ----------
export const sales = pgTable("sales", {
  id: uuid(),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  saleType: saleTypeEnum("sale_type").notNull(),
  lotId: text("lot_id").references(() => lots.id, { onDelete: "set null" }),
  animalId: text("animal_id").references(() => animals.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(1),
  saleMode: saleModeEnum("sale_mode").notNull(),
  unitValue: numeric("unit_value", { precision: 12, scale: 2, mode: "number" }),
  totalValue: numeric("total_value", { precision: 12, scale: 2, mode: "number" }).notNull(),
  costBasis: numeric("cost_basis", { precision: 12, scale: 2, mode: "number" }),
  profit: numeric("profit", { precision: 12, scale: 2, mode: "number" }),
  // liveWeightKg: peso vivo (kg) — em saleMode "carcaca", o peso antes do abate
  // (junto com carcassWeightKg, pra calcular o rendimento carcaça ÷ vivo); em
  // saleMode "vivo_peso", o peso vendido (usado pra calcular o valor por kg no
  // formulário). Guardados como pesos brutos, não o percentual/preço já pronto,
  // pra não duplicar dado nem correr risco de ficar desatualizado.
  liveWeightKg: numeric("live_weight_kg", { precision: 6, scale: 2, mode: "number" }),
  carcassWeightKg: numeric("carcass_weight_kg", { precision: 6, scale: 2, mode: "number" }),
  saleDate: timestamp("sale_date", { withTimezone: true }).notNull().defaultNow(),
  buyer: text("buyer"),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

export const salesRelations = relations(sales, ({ one }) => ({
  lot: one(lots, { fields: [sales.lotId], references: [lots.id] }),
  animal: one(animals, { fields: [sales.animalId], references: [animals.id] }),
}));

// ---------- Óbitos (baixa por morte) ----------
export const mortalityEvents = pgTable("mortality_events", {
  id: uuid(),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  animalId: text("animal_id").references(() => animals.id, { onDelete: "set null" }),
  lotId: text("lot_id").references(() => lots.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(1),
  reason: text("reason").notNull(), // motivo obrigatório
  eventDate: timestamp("event_date", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

// ---------- Financeiro / Carteira ----------
export const walletAccounts = pgTable("wallet_accounts", {
  id: uuid(),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: walletAccountTypeEnum("type").notNull(),
  balance: numeric("balance", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  notes: text("notes"),
  balanceUpdatedAt: timestamp("balance_updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

// ---------- Audit trail (edição/exclusão) ----------
export const auditLogs = pgTable("audit_logs", {
  id: uuid(),
  farmId: text("farm_id").notNull().references(() => farms.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(), // create | update | delete
  snapshot: text("snapshot"), // JSON string
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
