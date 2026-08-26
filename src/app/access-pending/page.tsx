import Image from "next/image";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function AccessPendingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.status === "aprovado") redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-drc-green-950 px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <Image
            src="/drc-logo.png"
            alt="DRC — Dorper Rebanho Carvalho"
            width={96}
            height={96}
            className="rounded-full shadow-lg"
          />
        </div>
        <div className="rounded-2xl bg-drc-cream-50 p-8 shadow-xl">
          <h1 className="text-lg font-semibold text-drc-green-950">
            Cadastro em análise
          </h1>
          <p className="mt-3 text-sm text-drc-green-900/80">
            Olá, {session.name}. Seu acesso ainda precisa ser aprovado pelo administrador
            da fazenda. Assim que aprovado, você poderá entrar normalmente.
          </p>
          <form action={logoutAction} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-lg border border-drc-green-700 px-4 py-2.5 font-medium text-drc-green-900 transition hover:bg-drc-green-950/5"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
