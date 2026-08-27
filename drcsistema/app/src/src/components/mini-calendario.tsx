import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const WEEKDAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Versão compacta do calendário de manejo — só números do dia e um pontinho
 * indicando tarefa pendente/atrasada, sem os detalhes da tarefa (não cabem
 * num card pequeno). Puramente visual: quem usa decide se/como deixa clicável
 * (ver o card "Tarefas de manejo" no dashboard, que embrulha isso num Link
 * pra página /manejo/calendario).
 */
export function MiniCalendario({
  monthDate,
  pendingDays,
  overdueDays,
}: {
  monthDate: Date;
  pendingDays: Set<string>;
  overdueDays: Set<string>;
}) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const rawLabel = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-drc-green-900/70">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LETTERS.map((letter, i) => (
          <div key={i} className="text-[10px] font-semibold uppercase text-drc-green-900/40">
            {letter}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, monthStart);
          const isCurrentDay = isToday(day);
          const overdue = overdueDays.has(key);
          const pending = pendingDays.has(key);
          return (
            <div key={key} className="flex flex-col items-center gap-0.5 py-0.5">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  !inMonth
                    ? "text-drc-green-900/25"
                    : isCurrentDay
                      ? "bg-drc-gold-500 font-semibold text-drc-green-950"
                      : "text-drc-green-900"
                }`}
              >
                {format(day, "d")}
              </span>
              <span
                className={`h-1 w-1 rounded-full ${
                  overdue ? "bg-red-500" : pending ? "bg-drc-gold-500" : "bg-transparent"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
