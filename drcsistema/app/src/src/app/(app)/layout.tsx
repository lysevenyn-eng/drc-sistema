import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { farms } from "@/db/schema";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const farm = session.farmId
    ? await db.query.farms.findFirst({ where: eq(farms.id, session.farmId) })
    : null;

  return (
    <AppShell userName={session.name} role={session.role} farmName={farm?.name ?? "—"}>
      {children}
    </AppShell>
  );
}
