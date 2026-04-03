import { describe, it, expect } from 'vitest';
import { appReducer } from './reducer';
import type { AppState, Task, Interruption } from '../types';

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
    interruptions: [],
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

describe('ADD_INTERRUPTION', () => {
  function makeInterruption(overrides: Partial<Interruption> = {}): Interruption {
    return {
      id: 'int-1',
      taskId: null,
      date: '2026-01-01',
      pausedAt: '2026-01-01T10:00:00.000Z',
      reason: 'Meeting',
      ...overrides,
    };
  }

  it('appends the interruption to the state', () => {
    const state = makeState([]);
    const interruption = makeInterruption();
    const next = appReducer(state, { type: 'ADD_INTERRUPTION', payload: interruption });
    expect(next.interruptions).toHaveLength(1);
    expect(next.interruptions[0]).toEqual(interruption);
  });

  it('preserves existing interruptions', () => {
    const existing = makeInterruption({ id: 'int-0' });
    const state = { ...makeState([]), interruptions: [existing] };
    const next = appReducer(state, { type: 'ADD_INTERRUPTION', payload: makeInterruption({ id: 'int-1' }) });
    expect(next.interruptions).toHaveLength(2);
    expect(next.interruptions[0].id).toBe('int-0');
  });

  it('sets updatedAt on the resulting state', () => {
    const state = makeState([]);
    const next = appReducer(state, { type: 'ADD_INTERRUPTION', payload: makeInterruption() });
    expect(next.updatedAt).toBeDefined();
  });
});
