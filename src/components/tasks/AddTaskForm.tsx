import { useState } from 'react';
import { useApp } from '../../hooks/useApp';
import { useLang } from '../../hooks/useLang';
import { todayStr } from '../../utils/formatters';
import type { Task } from '../../types';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export function AddTaskForm() {
  const { state, addTask } = useApp();
  const { t } = useLang();
  const [title, setTitle] = useState('');
  const [pomodoros, setPomodoros] = useState(1);
  const [ticketId, setTicketId] = useState('');
  const [error, setError] = useState('');

  const tickets = state.tickets ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t.tasks.errTitle);
      return;
    }
    const task: Task = {
      id: randomId(),
      title: title.trim(),
      estimatedPomodoros: pomodoros,
      completedPomodoros: 0,
      date: todayStr(),
      completed: false,
      ticketId: ticketId || undefined,
      createdAt: new Date().toISOString(),
    };
    addTask(task);
    setTitle('');
    setPomodoros(1);
    setTicketId('');
    setError('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setError(''); }}
            placeholder={t.tasks.addPlaceholder}
            className="w-full px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50 text-sm"
          />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPomodoros(p => Math.max(1, p - 1))}
            className="w-7 h-7 rounded bg-white/10 text-white hover:bg-white/20 text-sm font-bold"
          >−</button>
          <span className="text-white text-sm w-4 text-center">{pomodoros}</span>
          <button
            type="button"
            onClick={() => setPomodoros(p => Math.min(20, p + 1))}
            className="w-7 h-7 rounded bg-white/10 text-white hover:bg-white/20 text-sm font-bold"
          >+</button>
        </div>
        <button
          type="submit"
          className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t.tasks.add}
        </button>
      </div>
      {tickets.length > 0 && (
        <select
          value={ticketId}
          onChange={e => setTicketId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:border-white/50 text-sm"
        >
          <option value="">{t.tasks.noTicket}</option>
          {tickets.map(tk => (
            <option key={tk.id} value={tk.id}>{tk.number}{tk.description ? ` — ${tk.description}` : ''}</option>
          ))}
        </select>
      )}
    </form>
  );
}
