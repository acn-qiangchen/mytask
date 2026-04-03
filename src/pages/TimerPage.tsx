import { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
import { useTimer } from '../hooks/useTimer';
import { useApp } from '../hooks/useApp';
import { useLang } from '../hooks/useLang';
import { TimerModeSelector } from '../components/timer/TimerModeSelector';
import { TimerDisplay } from '../components/timer/TimerDisplay';
import { TimerControls } from '../components/timer/TimerControls';
import { AddTaskForm } from '../components/tasks/AddTaskForm';
import { TaskItem } from '../components/tasks/TaskItem';
import { ConfirmModal } from '../components/shared/ConfirmModal';
import { PauseReasonModal } from '../components/shared/PauseReasonModal';
import { SyncButton } from '../components/shared/SyncButton';
import { PullToRefresh } from '../components/shared/PullToRefresh';
import { todayStr } from '../utils/formatters';
import type { Task } from '../types';
import type { TimerMode } from '../hooks/useTimer';

function SortableTaskItem({ task, isActive, isDelayed, onSelect }: { task: Task; isActive: boolean; isDelayed: boolean; onSelect: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      <TaskItem
        task={task}
        isActive={isActive}
        isDelayed={isDelayed}
        onSelect={onSelect}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes}
      />
    </div>
  );
}

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
  const { state, addInterruption, clearCompletedTasks, manualSync, reorderTasks } = useApp();
  const { t } = useLang();
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

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
  const pendingTasks = state.tasks
    .filter(t => !t.completed && !t.archivedAt)
    .sort((a, b) => {
      const ao = a.order ?? Infinity;
      const bo = b.order ?? Infinity;
      return ao !== bo ? ao - bo : a.createdAt.localeCompare(b.createdAt);
    });
  const completedTasks = state.tasks
    .filter(t => t.completed && t.date === today && !t.archivedAt)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));
  const todayTasks = [...pendingTasks, ...completedTasks];
  const hasCompleted = completedTasks.length > 0;
  const needsTaskHint = timer.mode === 'focus' && !timer.activeTaskId && !timer.running;
  const pendingPomodoros = pendingTasks.reduce(
    (sum, t) => sum + Math.max(0, t.estimatedPomodoros - t.completedPomodoros),
    0
  );
  const bgGradient = BG_COLORS[timer.mode] ?? BG_COLORS.focus;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pendingTasks.findIndex(t => t.id === active.id);
    const newIndex = pendingTasks.findIndex(t => t.id === over.id);
    const reordered = arrayMove(pendingTasks, oldIndex, newIndex);
    reorderTasks(reordered.map(t => t.id));
  }

  function handlePause() {
    setShowPauseModal(true);
  }

  function handlePauseConfirm(reason: string) {
    addInterruption({
      id: Math.random().toString(36).slice(2, 10),
      taskId: timer.activeTaskId,
      date: todayStr(),
      pausedAt: new Date().toISOString(),
      reason,
    });
    timer.pause();
    setShowPauseModal(false);
  }

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
            onPause={handlePause}
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={pendingTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {pendingTasks.map(task => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      isActive={timer.activeTaskId === task.id}
                      isDelayed={task.date < today}
                      onSelect={handleSwitchTask}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {completedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isActive={false}
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
      {showPauseModal && (
        <PauseReasonModal
          onConfirm={handlePauseConfirm}
          onCancel={() => setShowPauseModal(false)}
        />
      )}
    </div>
    </PullToRefresh>
  );
}
