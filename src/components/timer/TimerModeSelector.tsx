import type { TimerMode } from '../../hooks/useTimer';
import { useLang } from '../../hooks/useLang';

interface Props {
  mode: TimerMode;
  onSwitch: (m: TimerMode) => void;
}

export function TimerModeSelector({ mode, onSwitch }: Props) {
  const { t } = useLang();

  const modes: { key: TimerMode; label: string }[] = [
    { key: 'focus', label: t.timer.focus },
    { key: 'short_break', label: t.timer.shortBreak },
    { key: 'long_break', label: t.timer.longBreak },
  ];

  return (
    <div className="flex gap-1 bg-white/10 rounded-xl p-1">
      {modes.map(m => (
        <button
          key={m.key}
          onClick={() => onSwitch(m.key)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            mode === m.key
              ? 'bg-white text-gray-800 shadow'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
