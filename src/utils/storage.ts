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
    settings: { ...DEFAULT_SETTINGS },
    selectedDate: todayStr(),
    updatedAt: new Date(0).toISOString(), // epoch — always loses to real data in mergeStates
  };
}

export function mergeStates(local: AppState, remote: AppState): AppState {
  // The newer source (by updatedAt) is primary for settings and task state.
  // Tasks and sessions from the older source that don't exist in the primary are always added,
  // so tasks are never silently dropped across devices.
  const remoteNewer = (remote.updatedAt ?? '') > (local.updatedAt ?? '');
  const primary = remoteNewer ? remote : local;
  const secondary = remoteNewer ? local : remote;

  const taskIds = new Set(primary.tasks.map(t => t.id));
  const sessionIds = new Set(primary.sessions.map(s => s.id));

  const mergedFromSecondary = secondary.tasks.filter(t => !taskIds.has(t.id));
  logSync(
    'mergeStates',
    `winner=${remoteNewer ? 'remote' : 'local'} ` +
    `primary.tasks=${primary.tasks.length} secondary.tasks=${secondary.tasks.length} ` +
    `merged_in=${mergedFromSecondary.length} ` +
    `local.updatedAt=${local.updatedAt ?? 'none'} remote.updatedAt=${remote.updatedAt ?? 'none'}`
  );

  const primaryInterruptions = primary.interruptions ?? [];
  const secondaryInterruptions = secondary.interruptions ?? [];
  const interruptionIds = new Set(primaryInterruptions.map(i => i.id));

  return {
    ...primary,
    tasks: [...primary.tasks, ...mergedFromSecondary],
    sessions: [...primary.sessions, ...secondary.sessions.filter(s => !sessionIds.has(s.id))],
    interruptions: [...primaryInterruptions, ...secondaryInterruptions.filter(i => !interruptionIds.has(i.id))],
    updatedAt: new Date().toISOString(),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return defaultAppState();
    const parsed = JSON.parse(raw) as AppState;
    // Backward compat: older stored states won't have interruptions
    if (!parsed.interruptions) parsed.interruptions = [];
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
