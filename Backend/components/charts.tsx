export function LineChart({
  labels,
  series,
}: {
  labels: string[];
  series: { color: string; values: number[]; fill?: string }[];
}) {
  const width = 640;
  const height = 220;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const max = Math.max(1, ...series.flatMap((item) => item.values));
  const ticks = [...new Set([0.25, 0.5, 0.75, 1].map((step) => Math.round(max * step)))];
  const x = (index: number) =>
    pad.l + (index * (width - pad.l - pad.r)) / Math.max(1, labels.length - 1);
  const y = (value: number) => pad.t + (1 - value / max) * (height - pad.t - pad.b);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} stroke="#eef0f4" />
          <text x={0} y={y(tick) + 4} fill="#98a2b3" fontSize="11">
            {tick}
          </text>
        </g>
      ))}
      {series.map((item) => {
        const line = item.values.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`).join(" ");
        const fill = `${line} L ${x(item.values.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
        return (
          <g key={item.color}>
            {item.fill && <path d={fill} fill={item.fill} />}
            <path d={line} fill="none" stroke={item.color} strokeWidth="2.5" />
          </g>
        );
      })}
      {labels.map((label, index) => (
        <text key={`${label}-${index}`} x={x(index)} y={height - 6} textAnchor="middle" fill="#98a2b3" fontSize="11">
          {label}
        </text>
      ))}
    </svg>
  );
}

export function AreaSpark({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const step = 120 / Math.max(1, values.length - 1);
  const points = values.map((value, index) => `${index * step},${36 - (value / max) * 30}`).join(" ");
  return (
    <svg viewBox="0 0 120 40" className="h-12 w-full">
      <polygon points={`0,40 ${points} 120,40`} fill={color} opacity="0.18" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function ColumnBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-16 items-end gap-1.5">
      {values.map((value, index) => (
        <div key={index} className="flex-1 rounded-sm" style={{ height: `${Math.max(8, (value / max) * 100)}%`, background: color }} />
      ))}
    </div>
  );
}

export function Donut({ parts }: { parts: { color: string; value: number }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="h-40 w-40">
      <g transform="rotate(-90 70 70)">
        {parts.map((part) => {
          const length = (part.value / total) * circ;
          const node = (
            <circle
              key={part.color}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={part.color}
              strokeWidth="18"
              strokeDasharray={`${length} ${circ - length}`}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return node;
        })}
      </g>
    </svg>
  );
}
