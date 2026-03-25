import { describe, it, expect } from 'vitest';
import { appReducer } from './reducer';
import type { AppState, Task } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test',
    estimatedPomodoros: 1,
    completedPomodoros: 0,
    date: '2026-01-01',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeState(tasks: Task[]): AppState {
  return {
    tasks,
    sessions: [],
    settings: {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      autoStartBreaks: false,
      autoStartPomodoros: false,
      soundEnabled: true,
    },
    selectedDate: '2026-01-01',
  };
}

describe('REORDER_TASKS', () => {
  it('assigns order values matching the position in the payload array', () => {
    const tasks = [
      makeTask({ id: 'a' }),
      makeTask({ id: 'b' }),
      makeTask({ id: 'c' }),
    ];
    const state = makeState(tasks);
    const next = appReducer(state, { type: 'REORDER_TASKS', payload: ['c', 'a', 'b'] });

    expect(next.tasks.find(t => t.id === 'c')?.order).toBe(0);
    expect(next.tasks.find(t => t.id === 'a')?.order).toBe(1);
    expect(next.tasks.find(t => t.id === 'b')?.order).toBe(2);
  });

  it('only updates tasks whose IDs appear in the payload', () => {
    const tasks = [
      makeTask({ id: 'a' }),
      makeTask({ id: 'b' }),
      makeTask({ id: 'other', order: 99 }),
    ];
    const state = makeState(tasks);
    const next = appReducer(state, { type: 'REORDER_TASKS', payload: ['b', 'a'] });

    expect(next.tasks.find(t => t.id === 'other')?.order).toBe(99);
  });

  it('sets updatedAt on the resulting state', () => {
    const state = makeState([makeTask({ id: 'a' })]);
    const next = appReducer(state, { type: 'REORDER_TASKS', payload: ['a'] });
    expect(next.updatedAt).toBeDefined();
  });

  it('does not mutate other task fields', () => {
    const task = makeTask({ id: 'a', title: 'Keep me', estimatedPomodoros: 3 });
    const state = makeState([task]);
    const next = appReducer(state, { type: 'REORDER_TASKS', payload: ['a'] });
    const updated = next.tasks.find(t => t.id === 'a')!;
    expect(updated.title).toBe('Keep me');
    expect(updated.estimatedPomodoros).toBe(3);
  });

  it('tasks without order field are unaffected by unrelated actions', () => {
    const task = makeTask({ id: 'a' });
    expect(task.order).toBeUndefined();
    const state = makeState([task]);
    const next = appReducer(state, { type: 'SET_DATE', payload: '2026-02-01' });
    expect(next.tasks.find(t => t.id === 'a')?.order).toBeUndefined();
  });
});
