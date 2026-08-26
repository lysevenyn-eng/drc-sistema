import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { animals, lots, users, managementTasks, managementTaskAssignees } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import {
  completeManagementTaskAction,
  reopenManagementTaskAction,
  deleteManagementTaskAction,
} from "@/app/actions/manejo";
import { ConfirmForm } from "@/components/confirm-form";

const TYPE_LABEL: Record<string, string> = {
  vacina: "Vacina",
  vermifugo: "Vermífugo",
  medicamento: "Medicamento",
  casqueamento: "Casqueamento",
  outro: "Outro",
};

type AnimalRow = typeof animals.$inferSelect;
type LotRow = typeof lots.$inferSelect;
type UserRow = typeof users.$inferSelect;
type AssigneeRow = typeof managementTaskAssignees.$inferSelect & { user: UserRow | null };
type TaskRow = typeof managementTasks.$inferSelect & {
  animal: AnimalRow | null;
  lot: LotRow | null;
  assignees: AssigneeRow[];
};

export default async function ManejoPage() {
  const session = await requireSession();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;
  const isAdmin = session.role === "admin";

  const tasks = await db.query.managementTasks.findMany({
    where: eq(managementTasks.farmId, farmId),
    with: { animal: true, lot: true, assignees: { with: { user: true } } },
    orderBy: (t, { asc }) => [asc(t.scheduledDate)],
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const pending = tasks.filter((t) => !t.completedDate);
  const myTasks = pending
    .filter((t) => t.assignees.some((a) => a.userId === session.userId))
    .sort((a, b) => +new Date(a.scheduledDate) - +new Date(b.scheduledDate));
  const overdue = pending.filter((t) => new Date(t.scheduledDate) < todayStart);
  const upcoming = pending.filter((t) => new Date(t.scheduledDate) >= todayStart);
  const completed = [...tasks]
    .filter((t) => t.completedDate)
    .sort((a, b) => +new Date(b.completedDate!) - +new Date(a.completedDate!));

  return (
    <div>
      <PageHeader
        title="Manejo e calendário"
        description="Vacinas, vermífugos, medicamentos, casqueamento e outras tarefas"
        action={
          <Link
            href="/manejo/novo"
            className="rounded-lg bg-drc-gold-500 px-3 py-1.5 text-sm font-semibold text-drc-green-950 hover:bg-drc-gold-400"
          >
            + Nova tarefa
          </Link>
        }
      />

      <div className="mb-6 flex gap-2 border-b border-drc-border">
        <span className="border-b-2 border-drc-gold-500 px-3 py-2 text-sm font-medium text-drc-green-950">
          Lista
        </span>
        <Link
          href="/manejo/calendario"
          className="px-3 py-2 text-sm font-medium text-drc-green-900/60 hover:text-drc-green-900"
        >
          Calendário
        </Link>
      </div>

      <TaskSection
        title="Minhas tarefas"
        tasks={myTasks}
        emptyText="Nenhuma tarefa atribuída a você no momento."
        isAdmin={isAdmin}
        todayStart={todayStart}
      />
      <TaskSection
        title="Atrasadas"
        tasks={overdue}
        emptyText="Nenhuma tarefa atrasada."
        isAdmin={isAdmin}
        todayStart={todayStart}
        className="mt-8"
      />
      <TaskSection
        title="Próximas"
        tasks={upcoming}
        emptyText="Nenhuma tarefa agendada."
        isAdmin={isAdmin}
        todayStart={todayStart}
        className="mt-8"
      />
      <TaskSection
        title="Concluídas"
        tasks={completed}
        emptyText="Nenhuma tarefa concluída ainda."
        isAdmin={isAdmin}
        todayStart={todayStart}
        className="mt-8"
        completedSection
      />
    </div>
  );
}

function assigneeNames(t: TaskRow) {
  const names = t.assignees.map((a) => a.user?.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "—";
}

function TaskSection({
  title,
  tasks,
  emptyText,
  isAdmin,
  todayStart,
  className = "",
  completedSection = false,
}: {
  title: string;
  tasks: TaskRow[];
  emptyText: string;
  isAdmin: boolean;
  todayStart: Date;
  className?: string;
  completedSection?: boolean;
}) {
  return (
    <div className={className}>
      <h2 className="mb-2 text-sm font-semibold text-drc-green-950">
        {title} {tasks.length > 0 && `(${tasks.length})`}
      </h2>
      <Card className="overflow-x-auto">
        {tasks.length === 0 ? (
          <EmptyState>{emptyText}</EmptyState>
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-drc-border text-left text-xs uppercase tracking-wide text-drc-green-900/60">
                <th className="px-4 py-2.5">{completedSection ? "Concluída em" : "Agendada para"}</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Produto / dose</th>
                <th className="px-4 py-2.5">Atribuído a</th>
                <th className="px-4 py-2.5">Alvo</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const isOverdue = !completedSection && new Date(t.scheduledDate) < todayStart;
                return (
                  <tr key={t.id} className="border-b border-drc-border/60 align-top last:border-0">
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 ${
                        isOverdue ? "font-medium text-red-600" : "text-drc-green-900/80"
                      }`}
                    >
                      {new Date(completedSection ? t.completedDate! : t.scheduledDate).toLocaleDateString(
                        "pt-BR"
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-drc-green-950">
                      {TYPE_LABEL[t.type] ?? t.type}
                    </td>
                    <td className="px-4 py-2.5 text-drc-green-900/80">
                      {t.product || t.dose
                        ? `${t.product ?? ""}${t.product && t.dose ? " — " : ""}${t.dose ?? ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-drc-green-900/80">{assigneeNames(t)}</td>
                    <td className="px-4 py-2.5 text-drc-green-900/80">
                      {t.targetType === "animal" ? (
                        t.animal ? (
                          <Link href={`/rebanho/animais/${t.animal.id}`} className="underline underline-offset-2">
                            {t.animal.tag}
                            {t.animal.name ? ` — ${t.animal.name}` : ""}
                          </Link>
                        ) : (
                          "—"
                        )
                      ) : (
                        (t.lot?.name ?? "—")
                      )}
                      {t.notes && <p className="mt-0.5 text-xs text-drc-green-900/50">{t.notes}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        {completedSection ? (
                          <form action={reopenManagementTaskAction}>
                            <input type="hidden" name="taskId" value={t.id} />
                            {t.animalId && <input type="hidden" name="animalId" value={t.animalId} />}
                            <button
                              type="submit"
                              className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                            >
                              Reabrir
                            </button>
                          </form>
                        ) : (
                          <form action={completeManagementTaskAction}>
                            <input type="hidden" name="taskId" value={t.id} />
                            {t.animalId && <input type="hidden" name="animalId" value={t.animalId} />}
                            <button
                              type="submit"
                              className="text-xs font-medium text-drc-green-700 underline underline-offset-2"
                            >
                              Marcar concluída
                            </button>
                          </form>
                        )}
                        {isAdmin && (
                          <ConfirmForm
                            action={deleteManagementTaskAction}
                            confirmMessage="Excluir esta tarefa de manejo? Esta ação não pode ser desfeita."
                          >
                            <input type="hidden" name="taskId" value={t.id} />
                            {t.animalId && <input type="hidden" name="animalId" value={t.animalId} />}
                            <button
                              type="submit"
                              className="text-xs font-medium text-red-600 underline underline-offset-2"
                            >
                              Excluir
                            </button>
                          </ConfirmForm>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
