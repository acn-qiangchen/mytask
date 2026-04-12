import { describe, it, expect } from 'vitest';
import { filterTasksBySessionDates, groupInterruptionsByReason } from './reportFilters';
import type { Task, Session, Interruption } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    estimatedPomodoros: 2,
    completedPomodoros: 1,
    date: '2026-02-02',
    completed: true,
    createdAt: '2026-02-02T09:00:00.000Z',
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    taskId: 'task-1',
    date: '2026-02-02',
    startTime: '2026-02-02T09:00:00.000Z',
    duration: 25,
    type: 'focus',
    completed: true,
    ...overrides,
  };
}

describe('filterTasksBySessionDates', () => {
  it('shows task when a session falls within the date range (not task.date)', () => {
    // Task planned on Feb 2, sessions on Feb 3 and Feb 4
    const task = makeTask({ id: 'a', date: '2026-02-02' });
    const sessions = [
      makeSession({ id: 's1', taskId: 'a', date: '2026-02-03' }),
      makeSession({ id: 's2', taskId: 'a', date: '2026-02-04' }),
    ];

    // Viewing Feb 4 report
    const result = filterTasksBySessionDates([task], sessions, '2026-02-04', '2026-02-04', '2026-02-04');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('excludes task when no sessions fall within the date range', () => {
    const task = makeTask({ id: 'a', date: '2026-02-02' });
    const sessions = [
      makeSession({ id: 's1', taskId: 'a', date: '2026-02-03' }),
    ];

    // Viewing Feb 5 report — no sessions on that day
    const result = filterTasksBySessionDates([task], sessions, '2026-02-05', '2026-02-05', '2026-02-05');
    expect(result).toHaveLength(0);
  });

  it('includes all tasks that have sessions within a multi-day range', () => {
    const taskA = makeTask({ id: 'a', date: '2026-02-01' });
    const taskB = makeTask({ id: 'b', date: '2026-02-01' });
    const sessions = [
      makeSession({ id: 's1', taskId: 'a', date: '2026-02-03' }),
      makeSession({ id: 's2', taskId: 'b', date: '2026-02-05' }),
    ];

    const result = filterTasksBySessionDates([taskA, taskB], sessions, '2026-02-01', '2026-02-07', '2026-02-07');
    expect(result).toHaveLength(2);
  });

  it('respects fromDate boundary (excludes sessions before fromDate)', () => {
    const task = makeTask({ id: 'a', date: '2026-02-01' });
    const sessions = [
      makeSession({ id: 's1', taskId: 'a', date: '2026-02-02' }),
      makeSession({ id: 's2', taskId: 'a', date: '2026-02-05' }),
    ];

    // fromDate = Feb 3, so Feb 2 session is excluded; Feb 5 session qualifies
    const result = filterTasksBySessionDates([task], sessions, '2026-02-03', '2026-02-07', '2026-02-07');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('respects toDate boundary (excludes sessions after toDate)', () => {
    const task = makeTask({ id: 'a', date: '2026-02-01' });
    const sessions = [
      makeSession({ id: 's1', taskId: 'a', date: '2026-02-08' }),
    ];

    const result = filterTasksBySessionDates([task], sessions, '2026-02-01', '2026-02-07', '2026-02-07');
    expect(result).toHaveLength(0);
  });

  it('defaults to today when both fromDate and toDate are empty', () => {
    const task = makeTask({ id: 'a', date: '2026-02-01' });
    const sessions = [
      makeSession({ id: 's1', taskId: 'a', date: '2026-04-12' }), // today
      makeSession({ id: 's2', taskId: 'a', date: '2026-02-10' }), // not today
    ];

    const result = filterTasksBySessionDates([task], sessions, '', '', '2026-04-12');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('excludes break sessions (null taskId) from affecting task list', () => {
    const task = makeTask({ id: 'a', date: '2026-02-01' });
    const sessions = [
      makeSession({ id: 's1', taskId: null, date: '2026-02-04' }), // break session
    ];

    const result = filterTasksBySessionDates([task], sessions, '2026-02-04', '2026-02-04', '2026-02-04');
    expect(result).toHaveLength(0);
  });

  it('returns empty array when there are no tasks', () => {
    const sessions = [makeSession()];
    const result = filterTasksBySessionDates([], sessions, '2026-02-02', '2026-02-02', '2026-02-02');
    expect(result).toHaveLength(0);
  });

  it('returns empty array when there are no sessions', () => {
    const task = makeTask({ id: 'a' });
    const result = filterTasksBySessionDates([task], [], '2026-02-02', '2026-02-02', '2026-02-02');
    expect(result).toHaveLength(0);
  });
});

describe('groupInterruptionsByReason', () => {
  function makeInterruption(overrides: Partial<Interruption> = {}): Interruption {
    return {
      id: 'int-1',
      taskId: null,
      date: '2026-02-02',
      pausedAt: '2026-02-02T10:00:00.000Z',
      reason: 'Meeting',
      ...overrides,
    };
  }

  it('returns empty array for no interruptions', () => {
    expect(groupInterruptionsByReason([], '(no reason)')).toHaveLength(0);
  });

  it('groups interruptions by reason', () => {
    const interruptions = [
      makeInterruption({ id: '1', reason: 'Meeting' }),
      makeInterruption({ id: '2', reason: 'Meeting' }),
      makeInterruption({ id: '3', reason: 'Phone call' }),
    ];
    const result = groupInterruptionsByReason(interruptions, '(no reason)');
    expect(result).toHaveLength(2);
    const meeting = result.find(r => r.title === 'Meeting');
    const phone = result.find(r => r.title === 'Phone call');
    expect(meeting?.count).toBe(2);
    expect(phone?.count).toBe(1);
  });

  it('groups empty-reason interruptions under the noReasonLabel', () => {
    const interruptions = [
      makeInterruption({ id: '1', reason: '' }),
      makeInterruption({ id: '2', reason: '   ' }), // whitespace-only
    ];
    const result = groupInterruptionsByReason(interruptions, '(no reason)');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('(no reason)');
    expect(result[0].count).toBe(2);
  });

  it('sorts results by count descending', () => {
    const interruptions = [
      makeInterruption({ id: '1', reason: 'Rare' }),
      makeInterruption({ id: '2', reason: 'Common' }),
      makeInterruption({ id: '3', reason: 'Common' }),
      makeInterruption({ id: '4', reason: 'Common' }),
      makeInterruption({ id: '5', reason: 'Rare' }),
    ];
    const result = groupInterruptionsByReason(interruptions, '(no reason)');
    expect(result[0].title).toBe('Common');
    expect(result[0].count).toBe(3);
    expect(result[1].title).toBe('Rare');
    expect(result[1].count).toBe(2);
  });

  it('handles a single interruption', () => {
    const result = groupInterruptionsByReason([makeInterruption()], '(no reason)');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Meeting');
    expect(result[0].count).toBe(1);
  });

  it('trims whitespace from reasons before grouping', () => {
    const interruptions = [
      makeInterruption({ id: '1', reason: ' Meeting ' }),
      makeInterruption({ id: '2', reason: 'Meeting' }),
    ];
    const result = groupInterruptionsByReason(interruptions, '(no reason)');
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(2);
  });
});
