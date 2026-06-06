interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ values, width = 80, height = 28 }: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line
          x1="0" x2={width} y1={height / 2} y2={height / 2}
          stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} strokeDasharray="2 4"
        />
      </svg>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pad = 2;
  const step = (width - pad * 2) / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.4}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        className="text-ink-400 dark:text-ink-300"
      />
    </svg>
  );
}
