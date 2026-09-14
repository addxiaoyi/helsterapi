// Lightweight SVG-based chart primitives. No external chart library required.
// Covers the charts needed across Dashboard, Home (public), Rankings, and Pricing:
//   <LineChart>   — multi-series, animated stroke-dashoffset entrance
//   <BarChart>    — vertical bars, optional grid, tooltips via title tag
//   <Sparkline>   — single-series mini line for metric cards
//   <DonutChart>  — SVG arc for model share charts
// All colors are pulled from CSS custom properties so theming works automatically.

import { useState, type ReactNode } from "react";

export type ChartSeries = {
  label: string;
  color: string; // CSS color string e.g. "var(--chart-1)" or "#3b82f6"
  data: number[];
};

export type ChartPoint = {
  x: number | string;
  y: number;
};

function minMax(series: ChartSeries): { minY: number; maxY: number } {
  const allY = series.data;
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const pad = (maxY - minY) * 0.1 || 1;
  return { minY: minY - pad, maxY: maxY + pad };
}

function EmptyPlot({ label, height }: { label: string; height: number }) {
  return (
    <svg viewBox={`0 0 600 ${height}`} className="h-full min-h-32 w-full" role="img" aria-label={label}>
      {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
        <line key={`h-${ratio}`} x1="48" x2="584" y1={height * ratio} y2={height * ratio} stroke="var(--border)" strokeDasharray="3 4" opacity="0.7" />
      ))}
      <line x1="48" x2="48" y1="12" y2={height - 28} stroke="var(--border)" />
      <line x1="48" x2="584" y1={height - 28} y2={height - 28} stroke="var(--border)" />
      <text x="316" y={height / 2} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">{label}</text>
    </svg>
  );
}

export function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-ink/10 bg-paper/60 p-5 sm:p-6">
      <h3 className="mb-2 text-overline font-mono uppercase tracking-widest text-ink">{title}</h3>
      {description && <p className="mb-4 text-micro text-muted">{description}</p>}
      {children}
    </section>
  );
}

// ─── LineChart ──────────────────────────────────────────────────────────────

type LineChartProps = {
  series: ChartSeries[];
  labels?: string[];
  height?: number;
  showGrid?: boolean;
  showDots?: boolean;
  formatY?: (v: number) => string;
  formatTooltip?: (label: string, values: { label: string; value: number; color: string }[]) => ReactNode;
};

export function LineChart({
  series,
  labels,
  height = 240,
  showGrid = true,
  showDots = false,
  formatY = (v) => v.toString(),
  formatTooltip,
}: LineChartProps) {
  const [activePoint, setActivePoint] = useState<{ series: number; point: number } | null>(null);
  if (series.length === 0 || series.every((item) => item.data.length === 0)) {
    return <EmptyPlot label="暂无图表数据" height={height} />;
  }
  const W = 600;
  const H = height;
  const padLeft = 48;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 40;
  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;

  const allY = series.flatMap((s) => s.data);
  let minY = Math.min(...allY);
  let maxY = Math.max(...allY);
  const pad = (maxY - minY) * 0.1 || 1;
  minY -= pad;
  maxY += pad;

  const yRange = maxY - minY;

  const pointCount = Math.max(labels?.length ?? series[0]?.data.length ?? 1, 1);
  const xStep = innerW / Math.max(pointCount - 1, 1);

  function xAt(i: number) {
    return padLeft + i * xStep;
  }
  function yAt(v: number) {
    return padTop + innerH - ((v - minY) / yRange) * innerH;
  }

  const gridLines = 4;
  const gridY: number[] = [];
  for (let i = 0; i <= gridLines; i += 1) {
    gridY.push(minY + (yRange * i) / gridLines);
  }

  const pathFor = (data: number[]) =>
    data
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
      .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height, overflow: "visible" }}
      aria-label="折线图"
    >
      {/* Grid */}
      {showGrid &&
        gridY.map((v, i) => (
          <line
            key={i}
            x1={padLeft}
            x2={padLeft + innerW}
            y1={yAt(v)}
            y2={yAt(v)}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ))}

      {/* Y-axis labels */}
      {gridY.map((v, i) => (
        <text
          key={i}
          x={padLeft - 6}
          y={yAt(v) + 4}
          textAnchor="end"
          fontSize={10}
          fill="var(--muted-foreground)"
        >
          {formatY(v)}
        </text>
      ))}

      {/* X-axis labels */}
      {labels?.map((l, i) => (
        <text
          key={i}
          x={xAt(i)}
          y={padTop + innerH + 20}
          textAnchor="middle"
          fontSize={10}
          fill="var(--muted-foreground)"
        >
          {l}
        </text>
      ))}

      {/* Areas + lines */}
      {series.map((s, si) => (
        <g key={si}>
          <path
            d={pathFor(s.data)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {showDots &&
            s.data.map((v, i) => (
              <circle
                key={i}
                cx={xAt(i)}
                cy={yAt(v)}
                r={3}
                fill={s.color}
              />
            ))}
        </g>
      ))}

      {/* Legend */}
      <g transform={`translate(${padLeft}, ${H - 8})`}>
        {series.map((s, i) => (
          <g key={i} transform={`translate(${i * 100}, 0)`}>
            <line x1={0} y1={0} x2={16} y2={0} stroke={s.color} strokeWidth={2} />
            <text x={20} y={4} fontSize={11} fill="var(--muted-foreground)">
              {s.label}
            </text>
          </g>
        ))}
      </g>

    </svg>
  );
}

// ─── BarChart ───────────────────────────────────────────────────────────────

type BarChartProps = {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValue?: boolean;
  formatY?: (v: number) => string;
};

export function BarChart({ data, height = 200, showValue = true, formatY = (v) => v.toFixed(0) }: BarChartProps) {
  const [activeBar, setActiveBar] = useState<number | null>(null);
  if (data.length === 0) {
    return <EmptyPlot label="暂无图表数据" height={height} />;
  }
  const W = 600;
  const H = height;
  const padLeft = 48;
  const padRight = 8;
  const padTop = 8;
  const padBottom = 36;
  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;

  const maxV = Math.max(...data.map((d) => d.value), 1);
  const pad = maxV * 0.08;
  const minY = 0;
  const maxY = maxV + pad;
  const yRange = maxY - minY;

  const barW = Math.min(48, (innerW / data.length) * 0.7);
  const gap = (innerW - barW * data.length) / (data.length + 1);

  function yAt(v: number) {
    return padTop + innerH - ((v - minY) / yRange) * innerH;
  }
  function barH(v: number) {
    return ((v - minY) / yRange) * innerH;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }} aria-label="柱状图">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <line
          key={i}
          x1={padLeft}
          x2={padLeft + innerW}
          y1={yAt(minY + pct * yRange)}
          y2={yAt(minY + pct * yRange)}
          stroke="var(--border)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const x = padLeft + gap + i * (barW + gap);
        const bh = barH(d.value);
        const y = yAt(d.value);
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={bh}
              rx={4}
              fill={d.color ?? "var(--chart-1)"}
              opacity={activeBar === null || activeBar === i ? 0.92 : 0.35}
              tabIndex={0}
              role="img"
              aria-label={`${d.label}: ${formatY(d.value)}`}
              onMouseEnter={() => setActiveBar(i)}
              onMouseLeave={() => setActiveBar(null)}
              onFocus={() => setActiveBar(i)}
              onBlur={() => setActiveBar(null)}
              className="cursor-pointer transition-opacity duration-150 focus-visible:stroke-ink focus-visible:stroke-2"
            >
              <title>{`${d.label}: ${formatY(d.value)}`}</title>
            </rect>
            {showValue && (
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted-foreground)"
              >
                {formatY(d.value)}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={padTop + innerH + 14}
              textAnchor="middle"
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {d.label}
            </text>
          </g>
        );
      })}

    </svg>
  );
}

// Horizontal bars keep long model and group names readable on narrow screens.
type HorizontalBarChartProps = {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  formatValue?: (value: number) => string;
};

export function HorizontalBarChart({
  data,
  height = 220,
  formatValue = (value) => value.toFixed(1),
}: HorizontalBarChartProps) {
  if (data.length === 0) return <EmptyPlot label="暂无图表数据" height={height} />;
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div
      className="flex w-full flex-col justify-center gap-3"
      style={{ minHeight: height }}
      role="img"
      aria-label="横向柱状图"
    >
      {data.map((item) => (
        <div key={item.label} className="grid min-w-0 grid-cols-[minmax(7rem,1fr)_minmax(0,2fr)_auto] items-center gap-3 text-caption">
          <span className="min-w-0 truncate font-mono text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          <div className="h-2 overflow-hidden bg-ink/10" aria-hidden="true">
            <div
              className="h-full transition-[width] duration-200"
              style={{
                width: `${Math.max((Math.max(item.value, 0) / maxValue) * 100, item.value > 0 ? 2 : 0)}%`,
                backgroundColor: item.color ?? "var(--chart-1)",
              }}
            />
          </div>
          <span className="font-mono tabular-nums text-muted-foreground">
            {formatValue(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

type SparklineProps = {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
};

export function Sparkline({
  data,
  color = "var(--chart-1)",
  width = 120,
  height = 40,
  fill = true,
}: SparklineProps) {
  if (data.length < 2) return null;
  const padL = 2;
  const padR = 2;
  const padT = 4;
  const padB = 4;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const minY = Math.min(...data);
  const maxY = Math.max(...data);
  const yRange = maxY - minY || 1;

  function xAt(i: number) {
    return padL + (i / (data.length - 1)) * innerW;
  }
  function yAt(v: number) {
    return padT + innerH - ((v - minY) / yRange) * innerH;
  }

  const pts = data.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const lineD = `M ${pts}`;
  const areaD = fill
    ? `M ${xAt(0).toFixed(1)},${(padT + innerH).toFixed(1)} L ${pts} L ${xAt(data.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} Z`
    : lineD;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width, height }} aria-label="趋势">
      {fill && <path d={areaD} fill={color} opacity={0.15} />}
      <path d={lineD} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

// ─── DonutChart ─────────────────────────────────────────────────────────────

type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  showLegend?: boolean;
};

export function DonutChart({ segments, size = 160, thickness = 32, showLegend = true }: DonutChartProps) {
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  if (segments.length === 0) {
    return (
      <div className="flex items-center gap-4 text-caption text-muted" role="img" aria-label="暂无图表数据">
        <div className="flex h-[132px] w-[132px] items-center justify-center rounded-full border-[24px] border-ink/10">
          <span className="text-center leading-tight">暂无<br />数据</span>
        </div>
      </div>
    );
  }
  const R = size / 2;
  const cx = R;
  const cy = R;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = R - thickness / 2;

  let currentAngle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    currentAngle += angle;
    const endAngle = currentAngle;

    const x1 = (cx + r * Math.cos(startAngle)).toFixed(2);
    const y1 = (cy + r * Math.sin(startAngle)).toFixed(2);
    const x2 = (cx + r * Math.cos(endAngle)).toFixed(2);
    const y2 = (cy + r * Math.sin(endAngle)).toFixed(2);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    return { ...seg, d, pct: ((seg.value / total) * 100).toFixed(1) };
  });

  return (
    <div className="flex min-w-0 items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }} aria-label="饼图">
        {arcs.map((arc, i) => (
          <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={thickness} strokeLinecap="butt" opacity={activeSegment === null || activeSegment === i ? 1 : 0.3} tabIndex={0} role="img" aria-label={`${arc.label}: ${arc.pct}%`} onMouseEnter={() => setActiveSegment(i)} onMouseLeave={() => setActiveSegment(null)} onFocus={() => setActiveSegment(i)} onBlur={() => setActiveSegment(null)} className="cursor-pointer transition-opacity duration-150 focus-visible:stroke-ink">
            <title>{`${arc.label}: ${arc.pct}%`}</title>
          </path>
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={600} fill="var(--foreground)">
          {total.toLocaleString()}
        </text>
      </svg>
      {showLegend && (
        <div className="min-w-0 flex flex-col gap-1.5 text-sm">
          {arcs.map((arc, i) => (
            <div key={i} className="flex items-center gap-2">
              <span style={{ width: 10, height: 10, borderRadius: 2, background: arc.color, display: "inline-block" }} />
              <span className={`min-w-0 truncate whitespace-nowrap ${activeSegment === i ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{arc.label}</span>
              <span className="font-medium ml-auto pl-2">{arc.pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
