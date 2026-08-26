import { BackButton } from "@/components/back-button";

export function PageHeader({
  title,
  description,
  action,
  showBack = false,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  showBack?: boolean;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        {showBack && <BackButton />}
        <h1 className="text-xl font-semibold text-drc-green-950">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-drc-green-900/70">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-drc-border bg-drc-cream-50 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-drc-green-900/60">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-drc-green-950">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-drc-green-900/50">{hint}</p>}
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "gold" | "red";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-drc-green-950/5 text-drc-green-900",
    green: "bg-drc-green-800/10 text-drc-green-800",
    gold: "bg-drc-gold-500/15 text-drc-green-900",
    red: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-drc-border p-8 text-center text-sm text-drc-green-900/60">
      {children}
    </div>
  );
}

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState>
        <p className="font-medium text-drc-green-900">Em construção</p>
        <p className="mt-1">{description}</p>
      </EmptyState>
    </div>
  );
}
