import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useApp } from '../hooks/useApp';
import { useLang } from '../hooks/useLang';
import { todayStr, getLast7Days, getLast30Days, shortDate, formatMinutes } from '../utils/formatters';

export function ReportsPage() {
  const { state } = useApp();
  const { t } = useLang();

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
      </div>
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
