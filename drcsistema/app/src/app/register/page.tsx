"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { registerAction, type ActionState } from "@/app/actions/auth";

export default function RegisterPage() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    registerAction,
    undefined
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-drc-green-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src="/drc-logo.png"
            alt="DRC — Dorper Rebanho Carvalho"
            width={96}
            height={96}
            priority
            className="rounded-full shadow-lg"
          />
        </div>
        <div className="rounded-2xl bg-drc-cream-50 p-8 shadow-xl">
          <h1 className="text-center text-lg font-semibold text-drc-green-950">
            Solicitar acesso
          </h1>
          <p className="mt-1 text-center text-sm text-drc-green-700/70">
            Crie sua conta ou peça acesso à sua fazenda
          </p>

          <form action={action} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-drc-green-900">
                Nome completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-drc-green-900">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50"
              />
              <p className="mt-1 text-xs text-drc-green-900/60">
                Se um administrador já pré-cadastrou seu acesso, use o mesmo e-mail — sua conta
                é ativada automaticamente, sem precisar de aprovação.
              </p>
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-drc-green-900">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50"
              />
            </div>
            <div>
              <label htmlFor="farmName" className="mb-1 block text-sm font-medium text-drc-green-900">
                Nome da fazenda/criatório
              </label>
              <input
                id="farmName"
                name="farmName"
                type="text"
                required
                placeholder="Ex.: DRC — Dorper Rebanho Carvalho"
                className="w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50"
              />
              <p className="mt-1 text-xs text-drc-green-900/60">
                Já existe uma fazenda com esse nome? Use exatamente o mesmo nome para pedir
                acesso a ela — o administrador vai aprovar seu cadastro. Nome novo cria uma
                fazenda nova, com você como administrador.
              </p>
            </div>

            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-drc-gold-500 px-4 py-2.5 font-semibold text-drc-green-950 transition hover:bg-drc-gold-400 disabled:opacity-60"
            >
              {pending ? "Enviando..." : "Criar conta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-drc-green-900/70">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-drc-green-700 underline underline-offset-2">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
