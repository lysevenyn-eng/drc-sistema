import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { setUserStatusAction, setUserRoleAction } from "@/app/actions/admin";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }

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
              <Badge tone={u.status === "aprovado" ? "green" : "red"}>
                {u.status === "aprovado" ? "Aprovado" : "Rejeitado"}
              </Badge>
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
              {u.id === admin.userId && <Badge tone="gold">Você</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
