import { useTimer } from '../hooks/useTimer';
import { useApp } from '../hooks/useApp';
import { useLang } from '../hooks/useLang';
import { TimerModeSelector } from '../components/timer/TimerModeSelector';
import { TimerDisplay } from '../components/timer/TimerDisplay';
import { TimerControls } from '../components/timer/TimerControls';
import { AddTaskForm } from '../components/tasks/AddTaskForm';
import { TaskItem } from '../components/tasks/TaskItem';
import { todayStr } from '../utils/formatters';

const BG_COLORS: Record<string, string> = {
  focus: 'from-red-700 to-red-900',
  short_break: 'from-green-700 to-green-900',
  long_break: 'from-blue-700 to-blue-900',
};

export function TimerPage() {
  const timer = useTimer();
  const { state } = useApp();
  const { t } = useLang();

  const today = todayStr();
  const todayTasks = state.tasks.filter(task => task.date === today);
  const todaySessions = state.sessions.filter(s => s.date === today && s.type === 'focus' && s.completed);
  const bgGradient = BG_COLORS[timer.mode] ?? BG_COLORS.focus;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} transition-all duration-700`}>
      <div className="max-w-xl mx-auto px-4 py-8 flex flex-col items-center gap-6">

        {/* Mode selector */}
        <TimerModeSelector mode={timer.mode} onSwitch={timer.switchMode} />

        {/* Timer */}
        <div className="flex flex-col items-center gap-4">
          <TimerDisplay display={timer.display} progress={timer.progress} mode={timer.mode} />
          <TimerControls
            running={timer.running}
            onStart={timer.start}
            onPause={timer.pause}
            onReset={timer.reset}
          />
        </div>

        {/* Session info */}
        <div className="flex items-center gap-3 text-white/60 text-sm">
          <span>{timer.sessionCount > 0 ? t.timer.session(timer.sessionCount) : ''}</span>
          {todaySessions.length > 0 && (
            <span>{t.timer.pomodorosToday(todaySessions.length)}</span>
          )}
        </div>

        {/* Active task indicator */}
        {timer.activeTaskId && (() => {
          const activeTask = state.tasks.find(t => t.id === timer.activeTaskId);
          return activeTask ? (
            <div className="text-white/80 text-sm bg-white/10 rounded-lg px-4 py-2">
              🍅 {activeTask.title}
            </div>
          ) : null;
        })()}

        {/* Task list */}
        <div className="w-full space-y-3">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider opacity-70">{t.tasks.title}</h2>
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
                  onSelect={id => timer.setActiveTaskId(id === timer.activeTaskId ? null : id)}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
