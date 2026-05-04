import type { AppState } from '../types';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { logSync } from './syncLog';

const STATE_KEY = 'mytask_state';
const IDENTITY_KEY = 'mytask_identity';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultAppState(): AppState {
  return {
    tasks: [],
    sessions: [],
    interruptions: [],
    tickets: [],
    settings: { ...DEFAULT_SETTINGS },
    selectedDate: todayStr(),
    updatedAt: new Date(0).toISOString(), // epoch — always loses to real data in mergeStates
    deletedTaskIds: [],
  };
}

export function mergeStates(local: AppState, remote: AppState): AppState {
  // The newer source (by updatedAt) is primary for settings and task state.
  // Tasks and sessions from the older source that don't exist in the primary are union-merged in,
  // EXCEPT for tasks recorded in either side's deletedTaskIds tombstone — those stay gone.
  const remoteNewer = (remote.updatedAt ?? '') > (local.updatedAt ?? '');
  const primary = remoteNewer ? remote : local;
  const secondary = remoteNewer ? local : remote;

  // Union tombstones from both sides so a deletion on either device is respected.
  const deletedTaskIds = new Set([
    ...(local.deletedTaskIds ?? []),
    ...(remote.deletedTaskIds ?? []),
  ]);

  const taskIds = new Set(primary.tasks.map(t => t.id));
  const sessionIds = new Set(primary.sessions.map(s => s.id));

  // Exclude tombstoned tasks from both primary and secondary.
  const filteredPrimaryTasks = primary.tasks.filter(t => !deletedTaskIds.has(t.id));
  const mergedFromSecondary = secondary.tasks.filter(t => !taskIds.has(t.id) && !deletedTaskIds.has(t.id));

  logSync(
    'mergeStates',
    `winner=${remoteNewer ? 'remote' : 'local'} ` +
    `primary.tasks=${primary.tasks.length} secondary.tasks=${secondary.tasks.length} ` +
    `merged_in=${mergedFromSecondary.length} tombstoned=${deletedTaskIds.size} ` +
    `local.updatedAt=${local.updatedAt ?? 'none'} remote.updatedAt=${remote.updatedAt ?? 'none'}`
  );

  const primaryInterruptions = primary.interruptions ?? [];
  const secondaryInterruptions = secondary.interruptions ?? [];
  const interruptionIds = new Set(primaryInterruptions.map(i => i.id));

  const primaryTickets = primary.tickets ?? [];
  const secondaryTickets = secondary.tickets ?? [];
  const ticketIds = new Set(primaryTickets.map(tk => tk.id));

  return {
    ...primary,
    tasks: [...filteredPrimaryTasks, ...mergedFromSecondary],
    sessions: [...primary.sessions, ...secondary.sessions.filter(s => !sessionIds.has(s.id))],
    interruptions: [...primaryInterruptions, ...secondaryInterruptions.filter(i => !interruptionIds.has(i.id))],
    tickets: [...primaryTickets, ...secondaryTickets.filter(tk => !ticketIds.has(tk.id))],
    deletedTaskIds: [...deletedTaskIds],
    updatedAt: new Date().toISOString(),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return defaultAppState();
    const parsed = JSON.parse(raw) as AppState;
    // Backward compat: older stored states won't have these fields
    if (!parsed.interruptions) parsed.interruptions = [];
    if (!parsed.tickets) parsed.tickets = [];
    if (!parsed.deletedTaskIds) parsed.deletedTaskIds = [];
    return parsed;
  } catch {
    return defaultAppState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function loadStoredIdentity(): string | null {
  return localStorage.getItem(IDENTITY_KEY);
}

export function saveIdentity(id: string): void {
  localStorage.setItem(IDENTITY_KEY, id);
}
