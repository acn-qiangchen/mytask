interface Props {
  display: string;
  progress: number;
  mode: string;
}

const MODE_COLORS: Record<string, string> = {
  focus: '#ef4444',
  short_break: '#22c55e',
  long_break: '#3b82f6',
};

export function TimerDisplay({ display, progress, mode }: Props) {
  const color = MODE_COLORS[mode] ?? '#ef4444';
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex items-center justify-center w-56 h-56">
      <svg className="absolute inset-0 -rotate-90" width="224" height="224" viewBox="0 0 224 224">
        <circle cx="112" cy="112" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
        <circle
          cx="112"
          cy="112"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="text-6xl font-bold text-white tabular-nums">{display}</span>
    </div>
  );
}
