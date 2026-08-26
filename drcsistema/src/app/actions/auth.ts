"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { farms, users, breeds } from "@/db/schema";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  SESSION_COOKIE,
} from "@/lib/auth";

const DEFAULT_BREEDS = ["Dorper", "White Dorper", "Santa Inês", "Mestiço Dorper", "Outro"];

export type ActionState = { error?: string } | undefined;

const RegisterSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe seu nome completo" }),
  email: z.email({ error: "Informe um e-mail válido" }).trim().toLowerCase(),
  password: z
    .string()
    .min(6, { error: "A senha precisa ter pelo menos 6 caracteres" }),
  farmName: z
    .string()
    .trim()
    .min(2, { error: "Informe o nome da fazenda/criatório" }),
});

async function startSession(user: {
  id: string;
  farmId: string | null;
  role: "admin" | "criador";
  status: "pendente" | "aprovado" | "rejeitado";
  name: string;
}) {
  const token = await createSessionToken({
    userId: user.id,
    farmId: user.farmId,
    role: user.role,
    status: user.status,
    name: user.name,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function registerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    farmName: formData.get("farmName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { name, email, password, farmName } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return { error: "Já existe uma conta com esse e-mail." };
  }

  let farm = await db.query.farms.findFirst({
    where: sql`lower(${farms.name}) = lower(${farmName})`,
  });

  let role: "admin" | "criador" = "criador";
  let status: "pendente" | "aprovado" = "pendente";

  if (!farm) {
    const [createdFarm] = await db.insert(farms).values({ name: farmName }).returning();
    farm = createdFarm;
    role = "admin";
    status = "aprovado";
    await db
      .insert(breeds)
      .values(DEFAULT_BREEDS.map((b) => ({ farmId: createdFarm.id, name: b })));
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ farmId: farm.id, name, email, passwordHash, role, status })
    .returning();

  await startSession(user);
  redirect(status === "aprovado" ? "/dashboard" : "/access-pending");
}

const LoginSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido" }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Informe a senha" }),
});

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { email, password } = parsed.data;
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos." };
  }

  await startSession(user);
  redirect(user.status === "aprovado" ? "/dashboard" : "/access-pending");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
