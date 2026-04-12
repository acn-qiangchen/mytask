import { describe, it, expect } from 'vitest';
import { appReducer } from './reducer';
import type { AppState, Task, Interruption, Ticket } from '../types';

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

describe('Ticket actions', () => {
  function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
    return {
      id: 'ticket-1',
      number: 'JIRA-1',
      description: 'Test ticket',
      createdAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('ADD_TICKET appends a ticket to the state', () => {
    const state = makeState([]);
    const ticket = makeTicket();
    const next = appReducer(state, { type: 'ADD_TICKET', payload: ticket });
    expect(next.tickets).toHaveLength(1);
    expect(next.tickets[0]).toEqual(ticket);
  });

  it('ADD_TICKET preserves existing tickets', () => {
    const existing = makeTicket({ id: 'ticket-0', number: 'JIRA-0' });
    const state = { ...makeState([]), tickets: [existing] };
    const next = appReducer(state, { type: 'ADD_TICKET', payload: makeTicket({ id: 'ticket-1' }) });
    expect(next.tickets).toHaveLength(2);
    expect(next.tickets[0].id).toBe('ticket-0');
  });

  it('UPDATE_TICKET replaces the matching ticket', () => {
    const ticket = makeTicket({ number: 'OLD-1' });
    const state = { ...makeState([]), tickets: [ticket] };
    const updated = { ...ticket, number: 'NEW-1', description: 'Updated' };
    const next = appReducer(state, { type: 'UPDATE_TICKET', payload: updated });
    expect(next.tickets).toHaveLength(1);
    expect(next.tickets[0].number).toBe('NEW-1');
    expect(next.tickets[0].description).toBe('Updated');
  });

  it('UPDATE_TICKET does not affect other tickets', () => {
    const t1 = makeTicket({ id: 'ticket-1', number: 'JIRA-1' });
    const t2 = makeTicket({ id: 'ticket-2', number: 'JIRA-2' });
    const state = { ...makeState([]), tickets: [t1, t2] };
    const next = appReducer(state, { type: 'UPDATE_TICKET', payload: { ...t1, number: 'CHANGED' } });
    expect(next.tickets.find(tk => tk.id === 'ticket-2')?.number).toBe('JIRA-2');
  });

  it('DELETE_TICKET removes the ticket by id', () => {
    const t1 = makeTicket({ id: 'ticket-1' });
    const t2 = makeTicket({ id: 'ticket-2' });
    const state = { ...makeState([]), tickets: [t1, t2] };
    const next = appReducer(state, { type: 'DELETE_TICKET', payload: 'ticket-1' });
    expect(next.tickets).toHaveLength(1);
    expect(next.tickets[0].id).toBe('ticket-2');
  });

  it('DELETE_TICKET clears ticketId from tasks that referenced it', () => {
    const ticket = makeTicket({ id: 'ticket-1' });
    const task = makeTask({ id: 'task-a', ticketId: 'ticket-1' });
    const unaffected = makeTask({ id: 'task-b', ticketId: 'ticket-2' });
    const state = { ...makeState([task, unaffected]), tickets: [ticket] };
    const next = appReducer(state, { type: 'DELETE_TICKET', payload: 'ticket-1' });
    expect(next.tasks.find(t => t.id === 'task-a')?.ticketId).toBeUndefined();
    expect(next.tasks.find(t => t.id === 'task-b')?.ticketId).toBe('ticket-2');
  });

  it('ticket actions set updatedAt', () => {
    const state = makeState([]);
    const next = appReducer(state, { type: 'ADD_TICKET', payload: makeTicket() });
    expect(next.updatedAt).toBeDefined();
  });
});
