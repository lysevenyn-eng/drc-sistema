import Link from "next/link";
import { eq, and, isNull } from "drizzle-orm";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isToday,
  parse,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import {
  animals,
  lots,
  users,
  managementTasks,
  managementTaskAssignees,
  accountsPayable,
  accountsReceivable,
} from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { formatCurrency } from "@/lib/money";

const TYPE_LABEL: Record<string, string> = {
  vacina: "Vacina",
  vermifugo: "Vermífugo",
  medicamento: "Medicamento",
  casqueamento: "Casqueamento",
  desmame: "Desmame",
  pesagem: "Pesagem",
  outro: "Outro",
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_PILLS = 3;

type AnimalRow = typeof animals.$inferSelect;
type LotRow = typeof lots.$inferSelect;
type UserRow = typeof users.$inferSelect;
type AssigneeRow = typeof managementTaskAssignees.$inferSelect & { user: UserRow | null };
type TaskRow = typeof managementTasks.$inferSelect & {
  animal: AnimalRow | null;
  lot: LotRow | null;
  assignees: AssigneeRow[];
};

// Uma célula do calendário mistura tarefas de manejo com (só para admins)
// lembretes de contas a pagar/receber — cada um vira uma "pill" nesse
// formato comum.
type Pill = {
  key: string;
  href: string;
  title: string;
  label: string;
  tone: "done" | "overdue" | "normal" | "payable" | "receivable";
};

const PILL_TONE_CLASS: Record<Pill["tone"], string> = {
  done: "bg-drc-green-950/5 text-drc-green-900/40 line-through",
  overdue: "bg-red-50 text-red-700",
  normal: "bg-drc-gold-500/15 text-drc-green-900",
  payable: "bg-amber-100 text-amber-900",
  receivable: "bg-sky-100 text-sky-900",
};

export default async function ManejoCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireSession();
  if (!session.farmId) {
    return <EmptyState>Sua conta ainda não está vinculada a uma fazenda.</EmptyState>;
  }
  const farmId = session.farmId;

  const { month: monthParam } = await searchParams;
  const now = new Date();
  const parsedMonth = monthParam ? parse(monthParam, "yyyy-MM", now) : now;
  const referenceDate = Number.isNaN(parsedMonth.getTime()) ? now : parsedMonth;

  const isAdmin = session.role === "admin";

  const [tasks, payables, receivables] = await Promise.all([
    db.query.managementTasks.findMany({
      where: eq(managementTasks.farmId, farmId),
      with: { animal: true, lot: true, assignees: { with: { user: true } } },
      orderBy: (t, { asc }) => [asc(t.scheduledDate)],
    }) as Promise<TaskRow[]>,
    isAdmin
      ? db.query.accountsPayable.findMany({
          where: and(eq(accountsPayable.farmId, farmId), isNull(accountsPayable.paidAt)),
          with: { purchase: { columns: { supplierName: true, description: true } } },
        })
      : Promise.resolve([]),
    isAdmin
      ? db.query.accountsReceivable.findMany({
          where: and(eq(accountsReceivable.farmId, farmId), isNull(accountsReceivable.receivedAt)),
          with: { sale: { columns: { buyer: true } } },
        })
      : Promise.resolve([]),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const byDay = new Map<string, Pill[]>();
  const pushPill = (dateKey: string, pill: Pill) => {
    const list = byDay.get(dateKey);
    if (list) list.push(pill);
    else byDay.set(dateKey, [pill]);
  };

  for (const t of tasks) {
    const key = format(new Date(t.scheduledDate), "yyyy-MM-dd");
    const isOverdue = !t.completedDate && new Date(t.scheduledDate) < todayStart;
    const target =
      t.targetType === "animal"
        ? t.animal
          ? `${t.animal.tag}${t.animal.name ? ` — ${t.animal.name}` : ""}`
          : "—"
        : (t.lot?.name ?? "—");
    pushPill(key, {
      key: `task-${t.id}`,
      href: "/manejo",
      title: `${TYPE_LABEL[t.type] ?? t.type} — ${target}`,
      label: TYPE_LABEL[t.type] ?? t.type,
      tone: t.completedDate ? "done" : isOverdue ? "overdue" : "normal",
    });
  }

  // Lembretes de contas a pagar (só para admins — ver Promise.all acima, que
  // já não busca nada quando não é admin). Só as não pagas: uma vez paga, o
  // lembrete deixa de fazer sentido no calendário.
  for (const p of payables) {
    const key = format(new Date(p.dueDate), "yyyy-MM-dd");
    const isOverdue = new Date(p.dueDate) < todayStart;
    const supplier = p.purchase?.supplierName || p.purchase?.description || "Fornecedor";
    pushPill(key, {
      key: `payable-${p.id}`,
      href: "/financeiro",
      title: `Pagar ${supplier} — ${formatCurrency(p.value)} (parcela ${p.installmentNumber}/${p.totalInstallments})`,
      label: `Pagar: ${supplier}`,
      tone: isOverdue ? "overdue" : "payable",
    });
  }

  // Lembretes de contas a receber (só para admins, mesma regra acima). Só as
  // não recebidas: uma vez recebida, o lembrete deixa de fazer sentido.
  for (const r of receivables) {
    const key = format(new Date(r.dueDate), "yyyy-MM-dd");
    const isOverdue = new Date(r.dueDate) < todayStart;
    const buyer = r.sale?.buyer || "Comprador";
    pushPill(key, {
      key: `receivable-${r.id}`,
      href: "/financeiro",
      title: `Receber de ${buyer} — ${formatCurrency(r.value)} (parcela ${r.installmentNumber}/${r.totalInstallments})`,
      label: `Receber: ${buyer}`,
      tone: isOverdue ? "overdue" : "receivable",
    });
  }

  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const prevMonthParam = format(subMonths(monthStart, 1), "yyyy-MM");
  const nextMonthParam = format(addMonths(monthStart, 1), "yyyy-MM");
  // Tailwind's `capitalize` maiusculiza cada palavra ("Agosto De 2026") — em vez disso,
  // maiusculiza só a primeira letra da string inteira, como se escreve em português.
  const rawMonthLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

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
        <Link
          href="/manejo"
          className="px-3 py-2 text-sm font-medium text-drc-green-900/60 hover:text-drc-green-900"
        >
          Lista
        </Link>
        <span className="border-b-2 border-drc-gold-500 px-3 py-2 text-sm font-medium text-drc-green-950">
          Calendário
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-drc-green-950">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Link
            href={`/manejo/calendario?month=${prevMonthParam}`}
            className="rounded-lg border border-drc-border bg-white p-1.5 text-drc-green-900 hover:bg-drc-cream-100"
            aria-label="Mês anterior"
          >
            <IconChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/manejo/calendario"
            className="rounded-lg border border-drc-border bg-white px-3 py-1.5 text-xs font-medium text-drc-green-900 hover:bg-drc-cream-100"
          >
            Hoje
          </Link>
          <Link
            href={`/manejo/calendario?month=${nextMonthParam}`}
            className="rounded-lg border border-drc-border bg-white p-1.5 text-drc-green-900 hover:bg-drc-cream-100"
            aria-label="Próximo mês"
          >
            <IconChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Card className="overflow-x-auto p-2 sm:p-3">
        <div className="grid min-w-[700px] grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-1.5 py-1 text-center text-xs font-semibold uppercase tracking-wide text-drc-green-900/60"
            >
              {label}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayPills = byDay.get(key) ?? [];
            const inMonth = isSameMonth(day, monthStart);
            const isCurrentDay = isToday(day);
            const visible = dayPills.slice(0, MAX_PILLS);
            const overflowCount = dayPills.length - visible.length;

            return (
              <div
                key={key}
                className={`min-h-[96px] rounded-lg border p-1.5 ${
                  inMonth ? "border-drc-border bg-white" : "border-drc-border/40 bg-drc-cream-100/50"
                } ${isCurrentDay ? "ring-2 ring-drc-gold-500" : ""}`}
              >
                <p
                  className={`mb-1 text-xs ${
                    inMonth ? "text-drc-green-900" : "text-drc-green-900/35"
                  } ${isCurrentDay ? "font-bold text-drc-green-950" : "font-medium"}`}
                >
                  {format(day, "d")}
                </p>
                <div className="space-y-1">
                  {visible.map((pill) => (
                    <Link
                      key={pill.key}
                      href={pill.href}
                      title={pill.title}
                      className={`block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight ${PILL_TONE_CLASS[pill.tone]}`}
                    >
                      {pill.label}
                    </Link>
                  ))}
                  {overflowCount > 0 && (
                    <Link
                      href="/manejo"
                      className="block px-1.5 text-[11px] font-medium text-drc-green-900/60 hover:text-drc-green-900"
                    >
                      +{overflowCount} mais
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="mt-3 text-xs text-drc-green-900/50">
        Para marcar como concluída, reabrir ou excluir uma tarefa, use a aba{" "}
        <Link href="/manejo" className="underline underline-offset-2">
          Lista
        </Link>
        .
      </p>
      {isAdmin && (
        <p className="mt-1 text-xs text-drc-green-900/50">
          Os lembretes em laranja são contas a pagar e em azul são contas a receber (só visíveis
          para administradores; atrasadas ficam em vermelho) — levam até{" "}
          <Link href="/financeiro" className="underline underline-offset-2">
            Financeiro
          </Link>
          , onde dá para marcar como pago/recebido.
        </p>
      )}
    </div>
  );
}
