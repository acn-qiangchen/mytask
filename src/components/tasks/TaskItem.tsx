import { useState } from 'react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { Task } from '../../types';
import { useApp } from '../../hooks/useApp';
import { useLang } from '../../hooks/useLang';

interface Props {
  task: Task;
  isActive: boolean;
  onSelect: (id: string) => void;
  dragHandleListeners?: SyntheticListenerMap;
  dragHandleAttributes?: DraggableAttributes;
}

export function TaskItem({ task, isActive, onSelect, dragHandleListeners, dragHandleAttributes }: Props) {
  const { updateTask, deleteTask } = useApp();
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPomodoros, setEditPomodoros] = useState(task.estimatedPomodoros);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function saveEdit() {
    if (!editTitle.trim()) return;
    updateTask({ ...task, title: editTitle.trim(), estimatedPomodoros: editPomodoros });
    setEditing(false);
  }

  function toggleComplete() {
    const nowCompleted = !task.completed;
    updateTask({
      ...task,
      completed: nowCompleted,
      completedAt: nowCompleted ? new Date().toISOString() : undefined,
    });
  }

  if (confirmDelete) {
    return (
      <div className="bg-white/10 rounded-lg p-3 text-sm text-white">
        <p className="mb-2">{t.tasks.deleteMessage}</p>
        <div className="flex gap-2">
          <button onClick={() => deleteTask(task.id)} className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-xs font-medium">{t.shared.delete}</button>
          <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs">{t.shared.cancel}</button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-white/10 rounded-lg p-3 space-y-2">
        <input
          type="text"
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          className="w-full px-2 py-1 rounded bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:border-white/50"
        />
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs">{t.tasks.labelPomodoros}:</span>
          <button onClick={() => setEditPomodoros(p => Math.max(1, p - 1))} className="w-6 h-6 rounded bg-white/10 text-white text-xs hover:bg-white/20">−</button>
          <span className="text-white text-sm w-4 text-center">{editPomodoros}</span>
          <button onClick={() => setEditPomodoros(p => Math.min(20, p + 1))} className="w-6 h-6 rounded bg-white/10 text-white text-xs hover:bg-white/20">+</button>
        </div>
        <div className="flex gap-2">
          <button onClick={saveEdit} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs text-white font-medium">{t.tasks.btnSave}</button>
          <button onClick={() => setEditing(false)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white">{t.tasks.btnCancel}</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 group transition-colors ${
        task.completed ? 'cursor-default opacity-50' : 'cursor-pointer'
      } ${isActive ? 'bg-white/20 border border-white/30' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}
      onClick={() => { if (!task.completed) onSelect(task.id); }}
    >
      {dragHandleListeners && (
        <button
          {...dragHandleListeners}
          {...dragHandleAttributes}
          onClick={e => e.stopPropagation()}
          className="flex items-center justify-center w-5 h-10 flex-shrink-0 text-white/30 touch-none cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm6-12a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
          </svg>
        </button>
      )}
      <button
        onClick={e => { e.stopPropagation(); toggleComplete(); }}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
          task.completed ? 'bg-green-400 border-green-400' : 'border-white/40 hover:border-white'
        }`}
      >
        {task.completed && (
          <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <span className={`flex-1 text-sm text-white ${task.completed ? 'line-through' : ''}`}>
        {task.title}
      </span>

      <div className="flex items-center gap-1 text-xs text-white/50 shrink-0">
        <span className="text-red-400">🍅</span>
        <span>{task.completedPomodoros}/{task.estimatedPomodoros}</span>
      </div>

      <div className="flex gap-1">
        <button
          onClick={e => { e.stopPropagation(); setEditing(true); setEditTitle(task.title); setEditPomodoros(task.estimatedPomodoros); }}
          className="p-1 text-white/40 hover:text-white rounded"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
          className="p-1 text-white/40 hover:text-red-400 rounded"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
