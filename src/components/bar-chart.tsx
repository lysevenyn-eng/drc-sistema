const VB_W = 300;
const VB_H = 130;
const PAD_TOP = 20;
const PAD_BOTTOM = 24;
const CHART_H = VB_H - PAD_TOP - PAD_BOTTOM;
const BASE_Y = VB_H - PAD_BOTTOM;

export type BarChartDatum = { label: string; value: number };

/**
 * Gráfico de barras simples em SVG, sem dependência externa (não há
 * biblioteca de gráficos no projeto — mesma linha do MiniCalendario, que
 * também é 100% "hand-rolled"). viewBox fixo com preserveAspectRatio padrão
 * (uniforme) evita distorcer texto/traços quando o container é esticado por
 * `w-full` em telas de larguras diferentes. Não interativo, então roda como
 * server component (sem "use client").
 */
export function BarChart({
  data,
  formatValue = (v: number) => String(v),
  emptyLabel = "Sem dados no período.",
}: {
  data: BarChartDatum[];
  formatValue?: (value: number) => string;
  emptyLabel?: string;
}) {
  const max = Math.max(0, ...data.map((d) => d.value));

  if (data.length === 0 || max <= 0) {
    return <p className="py-10 text-center text-sm text-drc-green-900/50">{emptyLabel}</p>;
  }

  const slot = VB_W / data.length;
  const barW = Math.min(slot * 0.5, 34);

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" role="img" aria-label="Gráfico de barras">
      <line
        x1="0"
        y1={BASE_Y}
        x2={VB_W}
        y2={BASE_Y}
        className="stroke-drc-border"
        strokeWidth="1"
      />
      {data.map((d, i) => {
        const h = (d.value / max) * CHART_H;
        const cx = i * slot + slot / 2;
        const x = cx - barW / 2;
        const y = BASE_Y - h;
        return (
          <g key={i}>
            <title>{`${d.label}: ${formatValue(d.value)}`}</title>
            {d.value > 0 && (
              <>
                <rect x={x} y={y} width={barW} height={h} rx="2" className="fill-drc-gold-500" />
                <text
                  x={cx}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="11"
                  className="fill-drc-green-950 font-medium"
                >
                  {formatValue(d.value)}
                </text>
              </>
            )}
            <text
              x={cx}
              y={BASE_Y + 16}
              textAnchor="middle"
              fontSize="10"
              className="fill-drc-green-900/60"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
