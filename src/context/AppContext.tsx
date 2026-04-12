import React, { createContext, useReducer, useEffect, useRef, useState } from 'react';
import type { AppState, Task, Session, Settings, Interruption, Ticket } from '../types';
import { appReducer } from './reducer';
import { loadState, saveState, loadStoredIdentity, saveIdentity, defaultAppState, mergeStates } from '../utils/storage';
import { loadFromDynamo, saveToDynamo } from '../utils/dynamoSync';
import { logSync } from '../utils/syncLog';

interface AppContextValue {
  state: AppState;
  syncing: boolean;
  manualSync: () => Promise<void>;
  addTask: (t: Task) => void;
  updateTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  clearCompletedTasks: (date: string) => void;
  addSession: (s: Session) => void;
  addInterruption: (i: Interruption) => void;
  incrementTaskPomodoro: (taskId: string) => void;
  updateSettings: (s: Settings) => void;
  setDate: (date: string) => void;
  reorderTasks: (orderedIds: string[]) => void;
  addTicket: (t: Ticket) => void;
  updateTicket: (t: Ticket) => void;
  deleteTicket: (id: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);
  const [syncing, setSyncing] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingFromRemote = useRef(false);
  const syncedTaskIdsRef = useRef<Set<string>>(new Set());
  const prevTaskCountRef = useRef<number>(state.tasks.length);

  useEffect(() => {
    setSyncing(true);
    loadingFromRemote.current = true;
    loadFromDynamo().then(({ state: remote, identityId }) => {
      const storedIdentity = loadStoredIdentity();
      const userChanged = identityId !== null && storedIdentity !== identityId;

      if (userChanged) {
        const fresh = remote ?? defaultAppState();
        dispatch({ type: 'LOAD_STATE', payload: fresh });
        saveState(fresh);
        saveIdentity(identityId);
        syncedTaskIdsRef.current = new Set(fresh.tasks.map(t => t.id));
      } else if (remote) {
        const local = loadState();
        const merged = mergeStates(local, remote);
        dispatch({ type: 'LOAD_STATE', payload: merged });
        saveState(merged);
        if (identityId) saveIdentity(identityId);
        syncedTaskIdsRef.current = new Set(merged.tasks.map(t => t.id));
        logSync('hydrate:complete',
          `dynamo.tasks=${remote.tasks.length} local.tasks=${local.tasks.length} merged.tasks=${merged.tasks.length}`
        );
      } else if (identityId) {
        saveIdentity(identityId);
      }

      loadingFromRemote.current = false;
      setSyncing(false);
    });
  }, []);

  useEffect(() => {
    saveState(state);                        // always keep localStorage current

    // Log state change with sync metrics
    const unsyncedCount = state.tasks.filter(t => !syncedTaskIdsRef.current.has(t.id)).length;
    const todayTasks = state.tasks.filter(t => t.date === state.selectedDate).length;
    logSync('stateChange',
      `tasks=${state.tasks.length} todayTasks=${todayTasks} unsynced=${unsyncedCount} selectedDate=${state.selectedDate}`
    );

    // Warn on bulk task drop (2+ tasks disappear at once)
    const dropped = prevTaskCountRef.current - state.tasks.length;
    if (dropped >= 2) {
      logSync('tasks:bulk-drop:warning',
        `tasks dropped from ${prevTaskCountRef.current} to ${state.tasks.length} ` +
        `remaining_ids=[${state.tasks.map(t => t.id).join(',')}]`
      );
      console.warn('tasks:bulk-drop', { dropped, prevCount: prevTaskCountRef.current, currentCount: state.tasks.length, tasks: state.tasks });
    }
    prevTaskCountRef.current = state.tasks.length;

    if (loadingFromRemote.current) return;   // guard only the DynamoDB write
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveToDynamo(state);
      syncedTaskIdsRef.current = new Set(state.tasks.map(t => t.id));
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state]);

  async function manualSync() {
    setSyncing(true);
    if (saveTimer.current) clearTimeout(saveTimer.current); // cancel any pending stale write
    const { state: remote, identityId } = await loadFromDynamo();
    if (remote) {
      const local = loadState();
      const merged = mergeStates(local, remote);
      dispatch({ type: 'LOAD_STATE', payload: merged });
      saveState(merged);
      if (identityId) saveIdentity(identityId);
      await saveToDynamo(merged); // push merged state immediately
      syncedTaskIdsRef.current = new Set(merged.tasks.map(t => t.id));
      logSync('manualSync:complete',
        `dynamo.tasks=${remote.tasks.length} local.tasks=${local.tasks.length} merged.tasks=${merged.tasks.length}`
      );
    }
    setSyncing(false);
  }

  const ctx: AppContextValue = {
    state,
    syncing,
    manualSync,
    addTask: (t) => dispatch({ type: 'ADD_TASK', payload: t }),
    updateTask: (t) => dispatch({ type: 'UPDATE_TASK', payload: t }),
    deleteTask: (id) => dispatch({ type: 'DELETE_TASK', payload: id }),
    clearCompletedTasks: (date) => dispatch({ type: 'CLEAR_COMPLETED_TASKS', payload: date }),
    addSession: (s) => dispatch({ type: 'ADD_SESSION', payload: s }),
    addInterruption: (i) => dispatch({ type: 'ADD_INTERRUPTION', payload: i }),
    incrementTaskPomodoro: (taskId) => dispatch({ type: 'INCREMENT_TASK_POMODORO', payload: taskId }),
    updateSettings: (s) => dispatch({ type: 'UPDATE_SETTINGS', payload: s }),
    setDate: (date) => dispatch({ type: 'SET_DATE', payload: date }),
    reorderTasks: (orderedIds) => dispatch({ type: 'REORDER_TASKS', payload: orderedIds }),
    addTicket: (t) => dispatch({ type: 'ADD_TICKET', payload: t }),
    updateTicket: (t) => dispatch({ type: 'UPDATE_TICKET', payload: t }),
    deleteTicket: (id) => dispatch({ type: 'DELETE_TICKET', payload: id }),
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}
