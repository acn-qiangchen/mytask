import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useLang } from '../hooks/useLang';
import type { Settings } from '../types';

export function SettingsPage() {
  const { state, updateSettings } = useApp();
  const { t, lang, setLang } = useLang();

  const [form, setForm] = useState<Settings>({ ...state.settings });
  const [saved, setSaved] = useState(false);

  function handleChange(key: keyof Settings, value: number | boolean) {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-md mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold">{t.settings.title}</h1>

        {/* Timer durations */}
        <section className="bg-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t.settings.timerTitle}</h2>
          <NumberField label={t.settings.focusDuration} value={form.focusDuration} min={1} max={60} onChange={v => handleChange('focusDuration', v)} />
          <NumberField label={t.settings.shortBreak} value={form.shortBreakDuration} min={1} max={30} onChange={v => handleChange('shortBreakDuration', v)} />
          <NumberField label={t.settings.longBreak} value={form.longBreakDuration} min={1} max={60} onChange={v => handleChange('longBreakDuration', v)} />
          <NumberField label={t.settings.longBreakInterval} value={form.longBreakInterval} min={2} max={10} onChange={v => handleChange('longBreakInterval', v)} />
        </section>

        {/* Auto start */}
        <section className="bg-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t.settings.autoStartTitle}</h2>
          <ToggleField label={t.settings.autoStartBreaks} value={form.autoStartBreaks} onChange={v => handleChange('autoStartBreaks', v)} />
          <ToggleField label={t.settings.autoStartPomodoros} value={form.autoStartPomodoros} onChange={v => handleChange('autoStartPomodoros', v)} />
        </section>

        {/* Language */}
        <section className="bg-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t.settings.languageTitle}</h2>
          <div className="flex gap-2">
            {(['en', 'ja'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  lang === l ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {l === 'en' ? 'English' : '日本語'}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
        >
          {saved ? t.settings.saved : t.settings.btnSave}
        </button>
      </div>
    </div>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-300">{label}</label>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - 1))} className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold">−</button>
        <span className="text-white text-sm w-6 text-center">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold">+</button>
      </div>
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-red-600' : 'bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
