import { reproductionEvents, animals } from "@/db/schema";

type AnimalRow = typeof animals.$inferSelect;
export type ReproEventRow = typeof reproductionEvents.$inferSelect & {
  mother: AnimalRow | null;
  father: AnimalRow | null;
  donorMother: AnimalRow | null;
};

export type CoberturaStatus =
  | "aguardando"
  | "nao_emprenhou"
  | "emprenhou"
  | "emprenhou_gemelar"
  | "obito"
  | "encerrada";

export type CoberturaResumo = {
  eventId: string;
  motherId: string;
  motherTag: string;
  motherName: string | null;
  fatherLabel: string | null;
  breedingMethod: "monta_natural" | "inseminacao_artificial" | "transferencia_embriao" | null;
  donorLabel: string | null;
  eventDate: Date;
  previsaoParto: Date;
  status: CoberturaStatus;
};

/**
 * Classifica cada evento de "cobertura" pelo resultado do ciclo, olhando os
 * eventos seguintes da MESMA matriz até a próxima cobertura (ou o fim da
 * lista) — essa janela é o que "pertence" a este ciclo. Prioridade dentro da
 * janela: parto > óbito > diagnóstico > nada ainda (aguardando resultado).
 * "Gemelar" pode vir do diagnóstico (nº de fetos, ver fetusCount) ou ser
 * confirmado só no parto (nº de filhotes) — o que for encontrado primeiro
 * nessa checagem já resolve a classificação (ver AskUserQuestion: gemelar
 * pode ser marcado "nos dois momentos"). closedWithoutResult (encerrar sem
 * resultado) tem prioridade sobre tudo: uma cobertura encerrada manualmente
 * não é reclassificada mesmo que outro evento exista na janela.
 */
export function classifyCoberturas(events: ReproEventRow[]): CoberturaResumo[] {
  const byMother = new Map<string, ReproEventRow[]>();
  for (const ev of events) {
    const list = byMother.get(ev.motherId);
    if (list) list.push(ev);
    else byMother.set(ev.motherId, [ev]);
  }
  for (const list of byMother.values()) {
    list.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }

  const results: CoberturaResumo[] = [];
  for (const list of byMother.values()) {
    const coberturaIdxs = list
      .map((ev, i) => (ev.eventType === "cobertura" ? i : -1))
      .filter((i) => i >= 0);

    for (const idx of coberturaIdxs) {
      const cobertura = list[idx];
      const nextCoberturaIdx = coberturaIdxs.find((i) => i > idx) ?? list.length;
      const window = list.slice(idx + 1, nextCoberturaIdx);

      const previsaoParto = new Date(cobertura.eventDate);
      previsaoParto.setDate(previsaoParto.getDate() + 150);

      let status: CoberturaStatus;
      if (cobertura.closedWithoutResult) {
        status = "encerrada";
      } else {
        const parto = window.find((e) => e.eventType === "parto");
        const obito = window.find((e) => e.eventType === "obito");
        const diagnostico = window.find((e) => e.eventType === "diagnostico_gestacao");

        if (parto) {
          status = (parto.offspringCount ?? 0) >= 2 ? "emprenhou_gemelar" : "emprenhou";
        } else if (obito) {
          status = "obito";
        } else if (diagnostico?.pregnant === true) {
          status =
            diagnostico.fetusCount != null && diagnostico.fetusCount >= 2
              ? "emprenhou_gemelar"
              : "emprenhou";
        } else if (diagnostico?.pregnant === false) {
          status = "nao_emprenhou";
        } else {
          status = "aguardando";
        }
      }

      const fatherLabel = cobertura.father
        ? `${cobertura.father.tag}${cobertura.father.name ? ` — ${cobertura.father.name}` : ""}`
        : cobertura.externalFatherName
          ? `${cobertura.externalFatherName} (externo)`
          : null;

      // Doadora: só existe quando o método é "transferencia_embriao" — nos
      // demais casos os campos vêm nulos e donorLabel fica null.
      const donorLabel = cobertura.donorMother
        ? `${cobertura.donorMother.tag}${cobertura.donorMother.name ? ` — ${cobertura.donorMother.name}` : ""}`
        : cobertura.externalDonorName
          ? `${cobertura.externalDonorName} (externa)`
          : null;

      results.push({
        eventId: cobertura.id,
        motherId: cobertura.motherId,
        motherTag: cobertura.mother?.tag ?? "—",
        motherName: cobertura.mother?.name ?? null,
        fatherLabel,
        breedingMethod: cobertura.breedingMethod,
        donorLabel,
        eventDate: new Date(cobertura.eventDate),
        previsaoParto,
        status,
      });
    }
  }

  results.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());
  return results;
}
