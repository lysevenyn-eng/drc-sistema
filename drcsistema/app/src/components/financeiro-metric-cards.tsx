"use client";

import { useState, useSyncExternalStore } from "react";
import { Card, Badge } from "@/components/ui";
import { IconFinance, IconTrade, IconWallet, IconReport, IconSettings, IconChevronUp, IconChevronDown } from "@/components/icons";
import { formatCurrency } from "@/lib/money";

export type LayerId = "bruta" | "custos" | "liquida" | "final";

type MonthNumericField = "receita" | "lucroVendas" | "resultado" | "resultadoFinal";

export type MetricMonthRow = {
  key: string;
  receita: number;
  lucroVendas: number;
  resultado: number;
  resultadoFinal: number;
};

type LayerDef = {
  label: string;
  hint: string;
  color: string;
  Icon: React.ComponentType<{ className?: string }>;
  monthField: MonthNumericField;
};

// As quatro "camadas" de receita pedidas no redesign — mesma ordem em que
// foram descritas: bruta → custos → líquida → resultado final. "Receita
// líquida" é o mesmo cálculo do "Resultado comercial" de sempre (só com nome
// novo pedido no redesign); "Resultado final" é a única conta genuinamente
// nova (lucro das vendas − despesas).
const LAYERS: Record<LayerId, LayerDef> = {
  bruta: {
    label: "Receita bruta",
    hint: "Vendas totais, mesmo a prazo",
    color: "#1c4f3f",
    Icon: IconFinance,
    monthField: "receita",
  },
  custos: {
    label: "Lucro das vendas",
    hint: "Receita − custos (venda − custo do animal)",
    color: "#0a2a21",
    Icon: IconTrade,
    monthField: "lucroVendas",
  },
  liquida: {
    label: "Receita líquida",
    hint: "Receita − despesas (mesmo cálculo do Resultado comercial)",
    color: "#f6b412",
    Icon: IconWallet,
    monthField: "resultado",
  },
  final: {
    label: "Resultado final",
    hint: "Receita − custos − despesas",
    color: "#031c16",
    Icon: IconReport,
    monthField: "resultadoFinal",
  },
};

const ALL_LAYER_IDS: LayerId[] = ["bruta", "custos", "liquida", "final"];

type CardsConfig = {
  order: LayerId[];
  enabled: LayerId[];
  limit: number;
};

const DEFAULT_CONFIG: CardsConfig = {
  order: ["bruta", "custos", "liquida", "final"],
  enabled: ["bruta", "custos", "liquida", "final"],
  limit: 4,
};

const STORAGE_KEY = "drc-financeiro-camadas-v1";

function isLayerId(v: unknown): v is LayerId {
  return typeof v === "string" && (ALL_LAYER_IDS as string[]).includes(v);
}

// Valida o que veio do localStorage: se o formato mudar numa versão futura,
// ou o valor estiver corrompido/incompleto, repara em vez de quebrar a
// página — nunca confia em dado vindo de fora sem checar.
function sanitizeConfig(raw: unknown): CardsConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_CONFIG;
  const r = raw as Record<string, unknown>;
  const validOrder = Array.isArray(r.order)
    ? Array.from(new Set(r.order.filter(isLayerId)))
    : [];
  const order = [...validOrder, ...ALL_LAYER_IDS.filter((id) => !validOrder.includes(id))];
  const enabled = Array.isArray(r.enabled) ? r.enabled.filter(isLayerId) : DEFAULT_CONFIG.enabled;
  const limit =
    typeof r.limit === "number" && Number.isFinite(r.limit)
      ? Math.min(4, Math.max(1, Math.round(r.limit)))
      : 4;
  return { order, enabled, limit };
}

// Mesmo padrão do app-shell.tsx pro menu recolhido: preferência guardada no
// localStorage e lida via useSyncExternalStore (em vez de useState +
// useEffect), pra não divergir entre a renderização no servidor e a do
// navegador. Como aqui o valor é um objeto (não um booleano simples), o
// snapshot precisa de um cache — sem isso, getSnapshot devolveria um objeto
// novo a cada chamada e o React entraria em loop de re-render.
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

let cachedRaw: string | null | undefined;
let cachedConfig: CardsConfig = DEFAULT_CONFIG;

function getSnapshot(): CardsConfig {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedConfig = raw ? sanitizeConfig(JSON.parse(raw)) : DEFAULT_CONFIG;
    } catch {
      cachedConfig = DEFAULT_CONFIG;
    }
  }
  return cachedConfig;
}

function getServerSnapshot(): CardsConfig {
  return DEFAULT_CONFIG;
}

function saveConfig(next: CardsConfig) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignora falha ao salvar (modo privado, etc.) — a config só não persiste
  }
  listeners.forEach((notify) => notify());
}

function pctChange(a: number, b: number) {
  if (a === 0) return null;
  return ((b - a) / Math.abs(a)) * 100;
}

const GRID_CLASS: Record<number, string> = {
  1: "sm:grid-cols-1 lg:grid-cols-1",
  2: "sm:grid-cols-2 lg:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Cards de "Visão de receita" do Financeiro, com sistema de camadas
 * configurável: o usuário escolhe quantos cards aparecem (limite de 1 a 4) e
 * quais das quatro camadas de receita mostrar e em que ordem. A preferência
 * fica salva no navegador (localStorage) — não é um dado da fazenda, é só
 * "como eu gosto de ver minha tela", por isso não passa pelo servidor.
 * `totals` são os valores totais (mesma conta dos StatCards de sempre) e
 * `monthRows` (ordem cronológica) só é usado pra calcular a variação % vs.
 * o mês anterior em cada card — o número grande do card continua sendo o
 * total geral, igual a todo StatCard desta página.
 */
export function FinanceiroMetricCards({
  totals,
  monthRows,
}: {
  totals: Record<LayerId, number>;
  monthRows: MetricMonthRow[];
}) {
  const config = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [panelOpen, setPanelOpen] = useState(false);

  const prev = monthRows[monthRows.length - 2];
  const curr = monthRows[monthRows.length - 1];

  const visibleIds = config.order.filter((id) => config.enabled.includes(id)).slice(0, config.limit);

  function update(partial: Partial<CardsConfig>) {
    saveConfig({ ...config, ...partial });
  }

  function toggleEnabled(id: LayerId) {
    const isEnabled = config.enabled.includes(id);
    update({
      enabled: isEnabled ? config.enabled.filter((x) => x !== id) : [...config.enabled, id],
    });
  }

  function move(id: LayerId, dir: -1 | 1) {
    const idx = config.order.indexOf(id);
    const target = idx + dir;
    if (target < 0 || target >= config.order.length) return;
    const nextOrder = [...config.order];
    [nextOrder[idx], nextOrder[target]] = [nextOrder[target], nextOrder[idx]];
    update({ order: nextOrder });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-drc-green-950">Visão de receita</h2>
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
          aria-controls="financeiro-cards-config"
          data-testid="metric-config-toggle"
          className="flex items-center gap-1.5 rounded-lg border border-drc-border bg-white px-2.5 py-1.5 text-xs font-medium text-drc-green-900/70 transition hover:bg-drc-green-950/5"
        >
          <IconSettings className="h-3.5 w-3.5" />
          Personalizar cards
        </button>
      </div>

      {panelOpen && (
        <div
          id="financeiro-cards-config"
          data-testid="metric-config-panel"
          className="mt-3 rounded-xl border border-drc-border bg-white p-4"
        >
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-drc-green-900/60">
              Quantidade de cards visíveis
            </p>
            <div
              role="group"
              aria-label="Quantidade de cards visíveis"
              className="flex w-fit gap-1 rounded-lg border border-drc-border bg-drc-cream-100 p-1"
            >
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update({ limit: n })}
                  aria-pressed={config.limit === n}
                  data-testid={`metric-limit-${n}`}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    config.limit === n
                      ? "bg-drc-green-950 text-white"
                      : "text-drc-green-900/70 hover:bg-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-drc-green-900/60">
                Camadas de receita (marque e reordene)
              </p>
              <button
                type="button"
                onClick={() => saveConfig(DEFAULT_CONFIG)}
                data-testid="metric-reset"
                className="shrink-0 text-xs font-medium text-drc-green-900/50 underline hover:text-drc-green-900"
              >
                Restaurar padrão
              </button>
            </div>
            <ul className="space-y-1.5">
              {config.order.map((id, idx) => {
                const layer = LAYERS[id];
                const checked = config.enabled.includes(id);
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 rounded-lg border border-drc-border/60 px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      id={`layer-check-${id}`}
                      checked={checked}
                      onChange={() => toggleEnabled(id)}
                      data-testid={`metric-layer-checkbox-${id}`}
                      className="h-4 w-4 accent-drc-green-800"
                    />
                    <label htmlFor={`layer-check-${id}`} className="min-w-0 flex-1 cursor-pointer">
                      <p className="text-sm font-medium text-drc-green-950">{layer.label}</p>
                      <p className="text-xs text-drc-green-900/50">{layer.hint}</p>
                    </label>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => move(id, -1)}
                        disabled={idx === 0}
                        aria-label={`Mover ${layer.label} para cima`}
                        data-testid={`metric-layer-up-${id}`}
                        className="rounded-md border border-drc-border p-1 text-drc-green-900/60 hover:bg-drc-green-950/5 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <IconChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(id, 1)}
                        disabled={idx === config.order.length - 1}
                        aria-label={`Mover ${layer.label} para baixo`}
                        data-testid={`metric-layer-down-${id}`}
                        className="rounded-md border border-drc-border p-1 text-drc-green-900/60 hover:bg-drc-green-950/5 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <IconChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {visibleIds.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-drc-border p-6 text-center text-sm text-drc-green-900/60">
          Nenhuma métrica selecionada.{" "}
          <button type="button" onClick={() => setPanelOpen(true)} className="underline">
            Escolher métricas
          </button>
        </div>
      ) : (
        <div
          className={`mt-3 grid grid-cols-1 gap-4 ${GRID_CLASS[visibleIds.length] ?? GRID_CLASS[4]}`}
          data-testid="metric-cards"
        >
          {visibleIds.map((id) => {
            const layer = LAYERS[id];
            const value = totals[id];
            const change =
              prev && curr ? pctChange(prev[layer.monthField], curr[layer.monthField]) : null;
            return (
              <div key={id} data-testid={`metric-card-${id}`}>
                <Card className="relative overflow-hidden p-4 pl-5">
                  <span
                    className="absolute inset-y-0 left-0 w-1.5"
                    style={{ backgroundColor: layer.color }}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${layer.color}1a`, color: layer.color }}
                      >
                        <layer.Icon className="h-4 w-4" />
                      </span>
                      <p className="text-xs font-medium uppercase tracking-wide text-drc-green-900/60">
                        {layer.label}
                      </p>
                    </div>
                    {change != null && (
                      <span data-testid={`metric-trend-${id}`}>
                        <Badge tone={change >= 0 ? "green" : "red"}>
                          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
                        </Badge>
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-drc-green-950">{formatCurrency(value)}</p>
                  <p className="mt-0.5 text-xs text-drc-green-900/50">{layer.hint}</p>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
