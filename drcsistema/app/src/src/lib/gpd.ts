export type WeighingLike = { id: string; weightKg: number; weighedAt: Date | string };

const DAY_MS = 86_400_000;

/**
 * GPD (ganho de peso diário, kg/dia) de cada pesagem em relação à pesagem
 * imediatamente anterior da MESMA lista (normalmente todas as pesagens de um
 * único animal). A primeira pesagem da lista não tem "anterior", então recebe null.
 */
export function computeGpdSeries<T extends WeighingLike>(list: T[]): Map<string, number | null> {
  const sorted = [...list].sort(
    (a, b) => new Date(a.weighedAt).getTime() - new Date(b.weighedAt).getTime()
  );
  const result = new Map<string, number | null>();
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      result.set(sorted[i].id, null);
      continue;
    }
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const days = (new Date(cur.weighedAt).getTime() - new Date(prev.weighedAt).getTime()) / DAY_MS;
    result.set(cur.id, days > 0 ? (cur.weightKg - prev.weightKg) / days : null);
  }
  return result;
}

/** GPD geral (kg/dia) entre a primeira e a última pesagem de uma lista. */
export function overallGpd<T extends WeighingLike>(list: T[]): number | null {
  if (list.length < 2) return null;
  const sorted = [...list].sort(
    (a, b) => new Date(a.weighedAt).getTime() - new Date(b.weighedAt).getTime()
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = (new Date(last.weighedAt).getTime() - new Date(first.weighedAt).getTime()) / DAY_MS;
  return days > 0 ? (last.weightKg - first.weightKg) / days : null;
}

export function formatGpd(gpd: number | null): string {
  if (gpd == null) return "—";
  return `${gpd >= 0 ? "+" : ""}${gpd.toFixed(3)} kg/dia`;
}
