import React, { createContext, useReducer, useEffect, useRef, useState } from 'react';
import type { AppState, Task, Session, Settings } from '../types';
import { appReducer } from './reducer';
import { loadState, saveState, loadStoredIdentity, saveIdentity, defaultAppState } from '../utils/storage';
import { loadFromDynamo, saveToDynamo } from '../utils/dynamoSync';

interface AppContextValue {
  state: AppState;
  syncing: boolean;
  addTask: (t: Task) => void;
  updateTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  addSession: (s: Session) => void;
  incrementTaskPomodoro: (taskId: string) => void;
  updateSettings: (s: Settings) => void;
  setDate: (date: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);
  const [syncing, setSyncing] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingFromRemote = useRef(false);

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
      } else if (remote) {
        dispatch({ type: 'LOAD_STATE', payload: remote });
        saveState(remote);
        if (identityId) saveIdentity(identityId);
      } else if (identityId) {
        saveIdentity(identityId);
      }

      loadingFromRemote.current = false;
      setSyncing(false);
    });
  }, []);

  useEffect(() => {
    if (loadingFromRemote.current) return;
    saveState(state);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToDynamo(state);
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state]);

  const ctx: AppContextValue = {
    state,
    syncing,
    addTask: (t) => dispatch({ type: 'ADD_TASK', payload: t }),
    updateTask: (t) => dispatch({ type: 'UPDATE_TASK', payload: t }),
    deleteTask: (id) => dispatch({ type: 'DELETE_TASK', payload: id }),
    addSession: (s) => dispatch({ type: 'ADD_SESSION', payload: s }),
    incrementTaskPomodoro: (taskId) => dispatch({ type: 'INCREMENT_TASK_POMODORO', payload: taskId }),
    updateSettings: (s) => dispatch({ type: 'UPDATE_SETTINGS', payload: s }),
    setDate: (date) => dispatch({ type: 'SET_DATE', payload: date }),
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}
