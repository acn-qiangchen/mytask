const LOG_KEY = 'mytask_sync_log';
const MAX_ENTRIES = 200;

export interface SyncLogEntry {
  ts: string;
  event: string;
  detail?: string;
}

export function logSync(event: string, detail?: string): void {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const entries: SyncLogEntry[] = raw ? JSON.parse(raw) : [];
    entries.push({ ts: new Date().toISOString(), event, detail });
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
    localStorage.setItem(LOG_KEY, JSON.stringify(entries));
  } catch {
    // never throw from a logger
  }
}

export function readSyncLog(): SyncLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearSyncLog(): void {
  localStorage.removeItem(LOG_KEY);
}
