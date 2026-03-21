import { useLang } from '../../hooks/useLang';

interface Props {
  running: boolean;
  hasActiveTask: boolean;
  mode: string;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onForceComplete: () => void;
}

export function TimerControls({ running, hasActiveTask, mode, onStart, onPause, onReset, onForceComplete }: Props) {
  const { t } = useLang();
  const startDisabled = !running && mode === 'focus' && !hasActiveTask;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onReset}
        className="p-3 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10"
        title={t.timer.reset}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      <button
        onClick={running ? onPause : onStart}
        disabled={startDisabled}
        className="px-10 py-3 bg-white text-gray-800 rounded-full font-bold text-lg shadow-lg hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
      >
        {running ? t.timer.pause : t.timer.start}
      </button>

      <button
        onClick={onForceComplete}
        disabled={!running && !hasActiveTask}
        className="p-3 text-green-400 hover:text-green-300 transition-colors rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        title={t.timer.forceComplete}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}
