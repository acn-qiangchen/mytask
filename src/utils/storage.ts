import type { AppState } from '../types';
import { DEFAULT_SETTINGS } from '../constants/defaults';

const STATE_KEY = 'mytask_state';
const IDENTITY_KEY = 'mytask_identity';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultAppState(): AppState {
  return {
    tasks: [],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS },
    selectedDate: todayStr(),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return defaultAppState();
    return JSON.parse(raw) as AppState;
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
