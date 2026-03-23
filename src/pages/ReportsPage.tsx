import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useApp } from '../hooks/useApp';
import { useLang } from '../hooks/useLang';
import { todayStr, getLast7Days, getLast30Days, shortDate, formatMinutes, formatDateTime } from '../utils/formatters';

export function ReportsPage() {
  const { state } = useApp();
  const { t } = useLang();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const today = todayStr();
  const focusSessions = state.sessions.filter(s => s.type === 'focus' && s.completed);

  const todayStats = useMemo(() => {
    const sessions = focusSessions.filter(s => s.date === today);
    const tasks = state.tasks.filter(task => task.date === today && task.completed);
    return {
      pomodoros: sessions.length,
      minutes: sessions.reduce((acc, s) => acc + s.duration, 0),
      tasksCompleted: tasks.length,
    };
  }, [focusSessions, state.tasks, today]);

  const weeklyData = useMemo(() => {
    const days = getLast7Days();
    return days.map(date => ({
      date: shortDate(date),
      minutes: focusSessions
        .filter(s => s.date === date)
        .reduce((acc, s) => acc + s.duration, 0),
    }));
  }, [focusSessions]);

  const monthlyData = useMemo(() => {
    const days = getLast30Days();
    return days.map(date => ({
      date: shortDate(date),
      minutes: focusSessions
        .filter(s => s.date === date)
        .reduce((acc, s) => acc + s.duration, 0),
    }));
  }, [focusSessions]);

  const hasData = focusSessions.length > 0;

  const todayPieData = useMemo(() => {
    const todaySessions = focusSessions.filter(s => s.date === today);
    if (todaySessions.length === 0) return [];
    const byTask: Record<string, { title: string; minutes: number }> = {};
    for (const s of todaySessions) {
      const key = s.taskId ?? '__none__';
      if (!byTask[key]) {
        const task = s.taskId ? state.tasks.find(t => t.id === s.taskId) : null;
        byTask[key] = { title: task?.title ?? t.reports.noTask, minutes: 0 };
      }
      byTask[key].minutes += s.duration;
    }
    return Object.entries(byTask).map(([, v]) => v);
  }, [focusSessions, state.tasks, today, t.reports.noTask]);

  const taskHistory = useMemo(() => {
    return state.tasks
      .filter(task => task.completed || task.archivedAt)
      .sort((a, b) => {
        const aTime = a.archivedAt ?? a.completedAt ?? a.createdAt;
        const bTime = b.archivedAt ?? b.completedAt ?? b.createdAt;
        return bTime.localeCompare(aTime);
      });
  }, [state.tasks]);

  const filteredHistory = useMemo(() => {
    return taskHistory.filter(task => {
      if (fromDate && task.date < fromDate) return false;
      if (toDate && task.date > toDate) return false;
      return true;
    });
  }, [taskHistory, fromDate, toDate]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold">{t.reports.title}</h1>

        {/* Today summary */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label={t.reports.focusTime} value={formatMinutes(todayStats.minutes)} sub={t.reports.today} />
          <StatCard label={t.reports.pomodorosCompleted} value={String(todayStats.pomodoros)} sub={t.reports.today} />
          <StatCard label={t.reports.tasksCompleted} value={String(todayStats.tasksCompleted)} sub={t.reports.today} />
        </div>

        {!hasData ? (
          <div className="text-center text-gray-500 py-12">{t.reports.noData}</div>
        ) : (
          <>
            {/* Weekly chart */}
            <div className="bg-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                {t.reports.weekly} — {t.reports.daily}
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                    labelStyle={{ color: '#f3f4f6' }}
                    itemStyle={{ color: '#ef4444' }}
                    formatter={(v) => [`${v} min`, t.reports.barLabel]}
                  />
                  <Bar dataKey="minutes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly chart */}
            <div className="bg-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                {t.reports.monthly} — {t.reports.daily}
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 9 }} interval={4} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                    labelStyle={{ color: '#f3f4f6' }}
                    itemStyle={{ color: '#ef4444' }}
                    formatter={(v) => [`${v} min`, t.reports.barLabel]}
                  />
                  <Bar dataKey="minutes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        {/* Today focus distribution pie chart */}
        <FocusDistributionChart data={todayPieData} title={t.reports.focusDistribution} noDataLabel={t.reports.noDistributionData} />

        {/* Task history */}
        <div className="bg-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            {t.reports.taskHistory}
          </h2>
          <div className="flex items-center gap-3 text-sm">
            <label className="text-gray-400 shrink-0">{t.reports.from}</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:border-gray-400"
            />
            <label className="text-gray-400 shrink-0">{t.reports.to}</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:border-gray-400"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); }}
                className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          {filteredHistory.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">{t.reports.noTaskHistory}</p>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map(task => (
                <div key={task.id} className="border-l-2 border-red-500/40 pl-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm text-white ${task.archivedAt ? 'opacity-50' : ''}`}>
                      {task.title}
                    </span>
                    <span className="text-xs text-red-400 shrink-0">
                      🍅 {task.completedPomodoros}/{task.estimatedPomodoros}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    <span>{t.reports.historyStarted}: {formatDateTime(task.createdAt)}</span>
                    {(task.completedAt ?? task.archivedAt) && (
                      <span>{t.reports.historyCompleted}: {formatDateTime((task.completedAt ?? task.archivedAt)!)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const PIE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#a855f7', '#ec4899',
];

interface PieEntry { title: string; minutes: number }

function FocusDistributionChart({ data, title, noDataLabel }: {
  data: PieEntry[];
  title: string;
  noDataLabel: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <div className="bg-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h2>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">{noDataLabel}</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="minutes"
                nameKey="title"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={40}
                onClick={(_, index) => setActiveIndex(activeIndex === index ? null : index)}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                    opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value, _name, props) => {
                  const mins = Number(value);
                  const pct = total > 0 ? Math.round((mins / total) * 100) : 0;
                  return [`${mins} min (${pct}%)`, (props as { payload?: PieEntry }).payload?.title ?? ''];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="mt-2 space-y-1.5">
            {data.map((d, i) => {
              const pct = total > 0 ? Math.round((d.minutes / total) * 100) : 0;
              return (
                <button
                  key={i}
                  onClick={() => setActiveIndex(activeIndex === i ? null : i)}
                  className="w-full flex items-center gap-2 text-sm text-left"
                >
                  <span
                    className="shrink-0 w-3 h-3 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className={`flex-1 truncate ${activeIndex === null || activeIndex === i ? 'text-gray-200' : 'text-gray-500'}`}>
                    {d.title}
                  </span>
                  <span className="text-gray-400 text-xs shrink-0">{d.minutes} min · {pct}%</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
      <div className="text-xs text-gray-600">{sub}</div>
    </div>
  );
}
