import { useApp } from '../../hooks/useApp';
import { useLang } from '../../hooks/useLang';

export function SyncButton() {
  const { syncing, manualSync } = useApp();
  const { t } = useLang();

  return (
    <button
      onClick={manualSync}
      disabled={syncing}
      aria-label={t.auth.syncNow}
      className="p-2 rounded-full text-white/60 hover:text-white/90 active:text-white transition-colors disabled:opacity-40"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`}
      >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </svg>
    </button>
  );
}
