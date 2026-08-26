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
export const roleEnum = pgEnum("role", ["admin", "criador"]);
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
    passwordHash: text("password_hash").notNull(),
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
  eventType: reproEventTypeEnum("event_type").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull().defaultNow(),
  // Parto: total de filhotes e quantos nasceram vivos (a diferença = natimortos).
  offspringCount: integer("offspring_count"),
  liveCount: integer("live_count"),
  // Diagnóstico de gestação: resultado (true = positivo, false = negativo).
  pregnant: boolean("pregnant"),
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
  quantity: integer("quantity").notNull(),
  breedId: text("breed_id").references(() => breeds.id),
  composition: compositionEnum("composition").notNull().default("misto"),
  totalValue: numeric("total_value", { precision: 12, scale: 2, mode: "number" }).notNull(),
  purchaseDate: timestamp("purchase_date", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

export const purchasesRelations = relations(purchases, ({ one }) => ({
  lot: one(lots, { fields: [purchases.lotId], references: [lots.id] }),
  animal: one(animals, { fields: [purchases.animalId], references: [animals.id] }),
  breed: one(breeds, { fields: [purchases.breedId], references: [breeds.id] }),
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
  // Só usados quando saleMode = "carcaca" — peso vivo (antes do abate) e peso
  // da carcaça (depois), pra calcular o rendimento de carcaça (carcaça ÷ vivo).
  // Guardados como dois pesos em vez de já salvar o percentual pronto, pra não
  // duplicar dado nem correr risco de o percentual ficar desatualizado.
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
