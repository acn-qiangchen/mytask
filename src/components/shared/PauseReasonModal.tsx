import { useState } from 'react';
import { useLang } from '../../hooks/useLang';

interface Props {
  /** Called with the reason string (may be empty if user skipped). */
  onConfirm: (reason: string) => void;
  /** Called if the user dismisses without pausing. */
  onCancel: () => void;
}

export function PauseReasonModal({ onConfirm, onCancel }: Props) {
  const { t } = useLang();
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState('');

  const effectiveReason = selected ?? custom.trim();

  function handleChip(reason: string) {
    setSelected(reason === selected ? null : reason);
    setCustom('');
  }

  function handleCustomChange(value: string) {
    setCustom(value);
    setSelected(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full border border-white/10">
        <h2 className="text-white font-semibold text-base mb-4">{t.timer.pauseReasonTitle}</h2>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {t.timer.pauseReasons.map((reason) => (
            <button
              key={reason}
              onClick={() => handleChip(reason)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selected === reason
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        {/* Custom text input */}
        <input
          type="text"
          value={custom}
          onChange={e => handleCustomChange(e.target.value)}
          placeholder={t.timer.pauseReasonPlaceholder}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-gray-400 placeholder-gray-500 mb-5"
        />

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => onConfirm('')}
            className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
          >
            {t.timer.pauseReasonSkip}
          </button>
          <button
            onClick={() => onConfirm(effectiveReason)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            {t.timer.pauseReasonConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
