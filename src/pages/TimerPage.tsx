import { useState, useEffect } from 'react';
import { useTimer } from '../hooks/useTimer';
import { useApp } from '../hooks/useApp';
import { useLang } from '../hooks/useLang';
import { TimerModeSelector } from '../components/timer/TimerModeSelector';
import { TimerDisplay } from '../components/timer/TimerDisplay';
import { TimerControls } from '../components/timer/TimerControls';
import { AddTaskForm } from '../components/tasks/AddTaskForm';
import { TaskItem } from '../components/tasks/TaskItem';
import { ConfirmModal } from '../components/shared/ConfirmModal';
import { SyncButton } from '../components/shared/SyncButton';
import { PullToRefresh } from '../components/shared/PullToRefresh';
import { todayStr } from '../utils/formatters';
import type { TimerMode } from '../hooks/useTimer';

const BG_COLORS: Record<string, string> = {
  focus: 'from-red-700 to-red-900',
  short_break: 'from-green-700 to-green-900',
  long_break: 'from-blue-700 to-blue-900',
};

interface PendingConfirm {
  message: string;
  onConfirm: () => void;
}

export function TimerPage() {
  const timer = useTimer();
  const { state, clearCompletedTasks, manualSync } = useApp();
  const { t } = useLang();
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  // Pause and deselect if the active task is marked complete while timer is running
  useEffect(() => {
    if (!timer.activeTaskId || !timer.running) return;
    const activeTask = state.tasks.find(t => t.id === timer.activeTaskId);
    if (activeTask?.completed) {
      timer.pause();
      timer.switchTask(null);
    }
  }, [state.tasks, timer.activeTaskId, timer.running]);

  const today = todayStr();
  const todayTasks = state.tasks
    .filter(task => task.date === today && !task.archivedAt)
    .sort((a, b) => Number(a.completed) - Number(b.completed));
  const hasCompleted = todayTasks.some(t => t.completed);
  const needsTaskHint = timer.mode === 'focus' && !timer.activeTaskId && !timer.running;
  const todaySessions = state.sessions.filter(s => s.date === today && s.type === 'focus' && s.completed);
  const pendingTasks = todayTasks.filter(t => !t.completed);
  const pendingPomodoros = pendingTasks.reduce(
    (sum, t) => sum + Math.max(0, t.estimatedPomodoros - t.completedPomodoros),
    0
  );
  const bgGradient = BG_COLORS[timer.mode] ?? BG_COLORS.focus;

  function handleSwitchMode(newMode: TimerMode) {
    if (newMode === timer.mode) return; // already on this mode, do nothing
    if (timer.running) {
      setPendingConfirm({
        message: t.timer.confirmSwitchMode,
        onConfirm: () => { timer.switchMode(newMode); setPendingConfirm(null); },
      });
      return;
    }
    timer.switchMode(newMode);
  }

  function handleSwitchTask(taskId: string) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task?.completed) return; // completed tasks cannot be focused
    if (taskId === timer.activeTaskId) {
      // While running, ignore deselect clicks — use Pause to stop the timer first
      if (!timer.running) timer.switchTask(null);
      return;
    }
    if (timer.running) {
      setPendingConfirm({
        message: t.timer.confirmSwitchTask,
        onConfirm: () => { timer.switchTask(taskId); setPendingConfirm(null); },
      });
      return;
    }
    timer.switchTask(taskId);
  }

  return (
    <PullToRefresh onRefresh={manualSync}>
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} transition-all duration-700`}>
      <div className="max-w-xl mx-auto px-4 py-8 flex flex-col items-center gap-6">

        <div className="w-full flex items-center justify-between">
          <div className="flex-1" />
          <TimerModeSelector mode={timer.mode} onSwitch={handleSwitchMode} />
          <div className="flex-1 flex justify-end">
            <SyncButton />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <TimerDisplay display={timer.display} progress={timer.progress} mode={timer.mode} />
          <TimerControls
            running={timer.running}
            hasActiveTask={timer.activeTaskId !== null}
            mode={timer.mode}
            onStart={timer.start}
            onPause={timer.pause}
            onReset={timer.reset}
            onForceComplete={timer.forceComplete}
          />
          {needsTaskHint && (
            <p className="text-white/50 text-xs">{t.timer.selectTask}</p>
          )}
          {pendingTasks.length > 0 && (
            <p className="text-white/60 text-xs text-center">
              {t.timer.queueMessage(pendingTasks.length, pendingPomodoros)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-white/60 text-sm">
          {timer.sessionCount > 0 && <span>{t.timer.session(timer.sessionCount)}</span>}
          {todaySessions.length > 0 && <span>{t.timer.pomodorosToday(todaySessions.length)}</span>}
        </div>

        {timer.activeTaskId && (() => {
          const activeTask = state.tasks.find(t => t.id === timer.activeTaskId);
          return activeTask ? (
            <div className="text-white/80 text-sm bg-white/10 rounded-lg px-4 py-2">
              🍅 {activeTask.title}
            </div>
          ) : null;
        })()}

        <div className="w-full space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">{t.tasks.title}</h2>
            {hasCompleted && (
              <button
                onClick={() => clearCompletedTasks(today)}
                className="text-white/40 hover:text-white/70 text-xs transition-colors"
              >
                {t.tasks.clearCompleted}
              </button>
            )}
          </div>
          <AddTaskForm />
          {todayTasks.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-4">{t.tasks.noTasks}</p>
          ) : (
            <div className="space-y-1.5">
              {todayTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isActive={timer.activeTaskId === task.id}
                  onSelect={handleSwitchTask}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {pendingConfirm && (
        <ConfirmModal
          message={pendingConfirm.message}
          confirmLabel={t.shared.cancel === 'Cancel' ? 'Switch' : '切り替え'}
          cancelLabel={t.shared.cancel}
          onConfirm={pendingConfirm.onConfirm}
          onCancel={() => setPendingConfirm(null)}
        />
      )}
    </div>
    </PullToRefresh>
  );
}
