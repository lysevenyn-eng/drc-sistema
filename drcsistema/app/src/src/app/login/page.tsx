"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { loginAction, type ActionState } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";

export default function LoginPage() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    loginAction,
    undefined
  );

  return (
    <AuthShell>
      <div className="mb-8 flex justify-center">
        <Image
          src="/drc-logo-full.png"
          alt="DRC — Dorper Rebanho Carvalho"
          width={260}
          height={111}
          priority
          className="drop-shadow-lg"
        />
      </div>
      <div className="rounded-2xl bg-drc-cream-50 p-8 shadow-xl">
        <h1 className="text-center text-lg font-semibold text-drc-green-950">
          Entrar no sistema
        </h1>

        <form action={action} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-drc-green-900"
            >
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
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-drc-green-900"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50"
            />
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
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-drc-green-900/70">
          Ainda não tem acesso?{" "}
          <Link
            href="/register"
            className="font-medium text-drc-green-700 underline underline-offset-2"
          >
            Solicitar cadastro
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
