import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import {
  setUserStatusAction,
  setUserRoleAction,
  preRegisterUserAction,
  deletePreRegisteredUserAction,
} from "@/app/actions/admin";

const inputClass =
  "w-full rounded-lg border border-drc-border bg-white px-3 py-2 text-sm text-drc-green-950 outline-none focus:border-drc-green-700 focus:ring-2 focus:ring-drc-gold-400/50";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ preCadastroError?: string; preCadastroSuccess?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }

  const { preCadastroError, preCadastroSuccess } = await searchParams;

  const allUsers = await db.query.users.findMany({
    where: eq(users.farmId, admin.farmId),
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });

  const pending = allUsers.filter((u) => u.status === "pendente");
  const others = allUsers.filter((u) => u.status !== "pendente");

  return (
    <div>
      <PageHeader
        title="Administração"
        description="Aprovação de acessos e papéis de cada usuário da fazenda"
      />

      <Card className="mb-8 p-5">
        <h2 className="mb-1 text-sm font-semibold text-drc-green-950">Pré-cadastrar usuário</h2>
        <p className="mb-4 text-xs text-drc-green-900/60">
          Cria o acesso da pessoa antes dela pedir — já aprovado, com o papel que você escolher.
          Ela ativa a conta em /register usando o mesmo e-mail, só preenchendo a senha.
        </p>

        {preCadastroError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {preCadastroError === "email"
              ? "Já existe uma conta com esse e-mail."
              : "Preencha nome, e-mail válido e papel."}
          </p>
        )}
        {preCadastroSuccess && (
          <p className="mb-4 rounded-lg bg-drc-green-800/10 px-3 py-2 text-sm text-drc-green-800">
            Usuário pré-cadastrado com sucesso.
          </p>
        )}

        <form
          action={preRegisterUserAction}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end"
        >
          <div>
            <label htmlFor="pc-name" className="mb-1 block text-xs font-medium text-drc-green-900">
              Nome completo
            </label>
            <input id="pc-name" name="name" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="pc-email" className="mb-1 block text-xs font-medium text-drc-green-900">
              E-mail
            </label>
            <input id="pc-email" name="email" type="email" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="pc-role" className="mb-1 block text-xs font-medium text-drc-green-900">
              Papel
            </label>
            <select id="pc-role" name="role" defaultValue="criador" className={inputClass}>
              <option value="criador">Criador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-drc-gold-500 px-4 py-2 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            Pré-cadastrar
          </button>
        </form>
      </Card>

      <h2 className="mb-2 text-sm font-semibold text-drc-green-950">
        Aguardando aprovação {pending.length > 0 && `(${pending.length})`}
      </h2>
      {pending.length === 0 ? (
        <EmptyState>Nenhum cadastro pendente no momento.</EmptyState>
      ) : (
        <div className="space-y-3">
          {pending.map((u) => (
            <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-drc-green-950">{u.name}</p>
                <p className="text-xs text-drc-green-900/60">{u.email}</p>
              </div>
              <div className="flex gap-2">
                <form action={setUserStatusAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="status" value="aprovado" />
                  <button
                    type="submit"
                    className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
                  >
                    Aprovar
                  </button>
                </form>
                <form action={setUserStatusAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="status" value="rejeitado" />
                  <button
                    type="submit"
                    className="rounded-lg border border-drc-border px-3 py-1.5 text-sm font-medium text-drc-green-900 hover:bg-drc-green-950/5"
                  >
                    Rejeitar
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-2 mt-8 text-sm font-semibold text-drc-green-950">Todos os usuários</h2>
      <div className="space-y-3">
        {others.map((u) => (
          <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-drc-green-950">{u.name}</p>
              <p className="text-xs text-drc-green-900/60">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {u.passwordHash == null ? (
                <Badge tone="gold">Aguardando 1º acesso</Badge>
              ) : (
                <Badge tone={u.status === "aprovado" ? "green" : "red"}>
                  {u.status === "aprovado" ? "Aprovado" : "Rejeitado"}
                </Badge>
              )}
              {u.status === "aprovado" && u.id !== admin.userId && (
                <form action={setUserRoleAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input
                    type="hidden"
                    name="role"
                    value={u.role === "admin" ? "criador" : "admin"}
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-drc-border px-3 py-1.5 text-xs font-medium text-drc-green-900 hover:bg-drc-green-950/5"
                  >
                    {u.role === "admin" ? "Tornar criador" : "Tornar administrador"}
                  </button>
                </form>
              )}
              {u.passwordHash == null && (
                <ConfirmForm
                  action={deletePreRegisteredUserAction}
                  confirmMessage={`Excluir o pré-cadastro de ${u.name}? Ela vai precisar ser cadastrada de novo.`}
                >
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-drc-border px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </ConfirmForm>
              )}
              {u.id === admin.userId && <Badge tone="gold">Você</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
