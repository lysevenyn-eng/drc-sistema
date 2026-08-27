/** Formata um valor em reais, ex.: 1234.5 -> "R$ 1.234,50". `null`/`undefined` vira "—". */
export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
