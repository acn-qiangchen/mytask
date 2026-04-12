import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defaultAppState, mergeStates } from './storage';
import type { AppState, Task } from '../types';

// syncLog writes to localStorage — stub it out
vi.mock('./syncLog', () => ({ logSync: vi.fn() }));

const EPOCH = new Date(0).toISOString();

function makeTask(id: string): Task {
  return {
    id,
    title: `Task ${id}`,
    estimatedPomodoros: 1,
    completedPomodoros: 0,
    date: '2026-01-01',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeState(tasks: Task[], updatedAt: string): AppState {
  return {
    tasks,
    sessions: [],
    interruptions: [],
    tickets: [],
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
    updatedAt,
  };
}

describe('defaultAppState', () => {
  it('has epoch updatedAt so it always loses to real data in mergeStates', () => {
    expect(defaultAppState().updatedAt).toBe(EPOCH);
  });

  it('has empty tasks and sessions', () => {
    const s = defaultAppState();
    expect(s.tasks).toHaveLength(0);
    expect(s.sessions).toHaveLength(0);
  });
});

describe('mergeStates', () => {
  beforeEach(() => {
    // localStorage needed for logSync (mocked but storage.ts still calls it)
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('remote wins when remote.updatedAt is newer', () => {
    const local = makeState([makeTask('a')], '2026-01-01T10:00:00.000Z');
    const remote = makeState([makeTask('b')], '2026-01-02T10:00:00.000Z');
    const merged = mergeStates(local, remote);
    // remote is primary — task b is in primary
    expect(merged.tasks.find(t => t.id === 'b')).toBeDefined();
    // task a from local (secondary) union-merged in
    expect(merged.tasks.find(t => t.id === 'a')).toBeDefined();
  });

  it('local wins when local.updatedAt is newer', () => {
    const local = makeState([makeTask('a')], '2026-01-02T10:00:00.000Z');
    const remote = makeState([makeTask('b')], '2026-01-01T10:00:00.000Z');
    const merged = mergeStates(local, remote);
    expect(merged.tasks.find(t => t.id === 'a')).toBeDefined();
    expect(merged.tasks.find(t => t.id === 'b')).toBeDefined();
  });

  it('empty default state (epoch) loses to real remote data', () => {
    const local = makeState([], EPOCH); // defaultAppState scenario
    const remote = makeState([makeTask('x'), makeTask('y')], '2026-03-01T00:00:00.000Z');
    const merged = mergeStates(local, remote);
    // remote should win as primary
    expect(merged.tasks).toHaveLength(2);
    expect(merged.tasks.find(t => t.id === 'x')).toBeDefined();
    expect(merged.tasks.find(t => t.id === 'y')).toBeDefined();
  });

  it('union-merges tasks from both sides — no task is lost', () => {
    const local = makeState([makeTask('a'), makeTask('b')], '2026-01-02T00:00:00.000Z');
    const remote = makeState([makeTask('b'), makeTask('c')], '2026-01-01T00:00:00.000Z');
    const merged = mergeStates(local, remote);
    const ids = merged.tasks.map(t => t.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('does not duplicate tasks present in both sides', () => {
    const task = makeTask('shared');
    const local = makeState([task], '2026-01-02T00:00:00.000Z');
    const remote = makeState([task], '2026-01-01T00:00:00.000Z');
    const merged = mergeStates(local, remote);
    expect(merged.tasks.filter(t => t.id === 'shared')).toHaveLength(1);
  });
});
