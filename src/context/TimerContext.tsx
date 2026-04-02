import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { Session } from '../types';
import { useApp } from '../hooks/useApp';
import { todayStr } from '../utils/formatters';
import { playModeSound } from '../utils/sounds';
import { loadTimerState, saveTimerState } from '../utils/timerSync';
import type { TimerSyncState } from '../utils/timerSync';
import { logSync } from '../utils/syncLog';

export type TimerMode = 'focus' | 'short_break' | 'long_break';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export interface TimerContextValue {
  mode: TimerMode;
  running: boolean;
  display: string;
  progress: number;
  sessionCount: number;
  activeTaskId: string | null;
  switchTask: (taskId: string | null) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  forceComplete: () => void;
  switchMode: (newMode: TimerMode) => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTimerContext(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimerContext must be used within TimerProvider');
  return ctx;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { state, addSession, incrementTaskPomodoro } = useApp();
  const { settings } = state;

  const durationFor = useCallback((mode: TimerMode): number => {
    if (mode === 'focus') return settings.focusDuration * 60;
    if (mode === 'short_break') return settings.shortBreakDuration * 60;
    return settings.longBreakDuration * 60;
  }, [settings]);

  const [mode, setModeState] = useState<TimerMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(() => settings.focusDuration * 60);
  const [running, setRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const startTimeRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const secondsLeftRef = useRef(secondsLeft);
  runningRef.current = running;
  secondsLeftRef.current = secondsLeft;

  /**
   * Tracks the highest `updatedAt` we have either written ourselves or applied
   * from remote. Used for last-writer-wins conflict resolution:
   * - Set synchronously before each DynamoDB write (prevents applying own echo on next poll)
   * - Set when applying remote state (prevents re-applying same state repeatedly)
   * - Apply remote only if remote.updatedAt > lastKnownUpdatedAt.current
   */
  const lastKnownUpdatedAt = useRef<string>('');

  // Reset timer when settings/mode change, but only if not running
  useEffect(() => {
    if (!runningRef.current) {
      setSecondsLeft(durationFor(mode));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, mode, durationFor]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endTimeRef.current = null;
  }, []);

  // Snap to wall clock when tab becomes visible
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden && runningRef.current && endTimeRef.current !== null) {
        setSecondsLeft(Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000)));
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const startTicking = useCallback((endTime: number) => {
    endTimeRef.current = endTime;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((endTimeRef.current! - Date.now()) / 1000)));
    }, 500);
  }, []);

  /**
   * Fire-and-forget: set lastKnownUpdatedAt synchronously before the async write
   * so that the next poll won't re-apply our own echoed state.
   */
  const pushTimerState = useCallback((
    isRunning: boolean,
    mode: TimerMode,
    endTime: number | null,
    activeTaskId: string | null,
    sessionCount: number,
  ) => {
    const updatedAt = new Date().toISOString();
    lastKnownUpdatedAt.current = updatedAt;
    const syncState: TimerSyncState = { isRunning, mode, endTime, activeTaskId, sessionCount, updatedAt };
    saveTimerState(syncState); // intentionally not awaited
    logSync('timerSync:push', `running=${isRunning} mode=${mode} endTime=${endTime} updatedAt=${updatedAt}`);
  }, []);

  /**
   * Apply a remote timer state from another device.
   * If the session is still running (endTime in the future), reconstruct the
   * running timer. Otherwise restore mode/task/sessionCount in idle state.
   *
   * NOTE: If both devices have the same session open and it completes naturally
   * on both, each will record a session entry. Those get union-merged in
   * mergeStates by session ID, but will still appear as two separate entries
   * (double-counting). This is a known limitation for the multi-device scenario.
   */
  const applyRemoteTimerState = useCallback((remote: TimerSyncState) => {
    lastKnownUpdatedAt.current = remote.updatedAt;
    logSync('timerSync:apply', `running=${remote.isRunning} mode=${remote.mode} endTime=${remote.endTime} updatedAt=${remote.updatedAt}`);

    clearTimer();
    setModeState(remote.mode);
    setSessionCount(remote.sessionCount);
    setActiveTaskId(remote.activeTaskId);

    if (remote.isRunning && remote.endTime !== null && remote.endTime > Date.now()) {
      const remaining = Math.round((remote.endTime - Date.now()) / 1000);
      setSecondsLeft(remaining);
      setRunning(true);
      startTicking(remote.endTime);
    } else {
      // Session ended or is paused — show idle state for the current mode.
      // Do NOT call onSessionComplete here: the originating device already
      // recorded the session and incremented the pomodoro counter.
      setRunning(false);
      setSecondsLeft(durationFor(remote.mode));
    }
  }, [clearTimer, startTicking, durationFor]);

  // On mount: restore timer state from DynamoDB so opening the app on a second
  // device picks up a session already running on the first device.
  useEffect(() => {
    loadTimerState().then((remote) => {
      if (remote && remote.updatedAt > lastKnownUpdatedAt.current) {
        applyRemoteTimerState(remote);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // Poll every 8 seconds so manual actions on one device (pause, mode switch,
  // task switch) appear on another device within the 10-second tolerance
  // specified in the acceptance criteria.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const remote = await loadTimerState();
        if (remote && remote.updatedAt > lastKnownUpdatedAt.current) {
          applyRemoteTimerState(remote);
        }
      } catch {
        // Silently ignore network errors during polling
      }
    }, 8000);
    return () => clearInterval(id);
  }, [applyRemoteTimerState]);

  const onSessionComplete = useCallback(() => {
    clearTimer();
    setRunning(false);

    const newCount = mode === 'focus' ? sessionCount + 1 : sessionCount;
    if (mode === 'focus') {
      setSessionCount(newCount);
      const activeTask = state.tasks.find(t => t.id === activeTaskId);
      if (activeTaskId && !activeTask?.completed) incrementTaskPomodoro(activeTaskId);

      addSession({
        id: randomId(),
        taskId: activeTaskId,
        date: todayStr(),
        startTime: startTimeRef.current ?? new Date().toISOString(),
        duration: settings.focusDuration,
        type: 'focus',
        completed: true,
      } as Session);

      const nextMode: TimerMode =
        newCount % settings.longBreakInterval === 0 ? 'long_break' : 'short_break';
      const nextSecs = durationFor(nextMode);
      setModeState(nextMode);
      setSecondsLeft(nextSecs);

      if (settings.autoStartBreaks) {
        playModeSound(nextMode, settings.soundEnabled);
        startTimeRef.current = new Date().toISOString();
        const nextEndTime = Date.now() + nextSecs * 1000;
        startTicking(nextEndTime);
        setRunning(true);
        pushTimerState(true, nextMode, nextEndTime, activeTaskId, newCount);
      } else {
        pushTimerState(false, nextMode, null, activeTaskId, newCount);
      }
    } else {
      addSession({
        id: randomId(),
        taskId: null,
        date: todayStr(),
        startTime: startTimeRef.current ?? new Date().toISOString(),
        duration: mode === 'short_break' ? settings.shortBreakDuration : settings.longBreakDuration,
        type: mode,
        completed: true,
      } as Session);

      const focusSecs = durationFor('focus');
      setModeState('focus');
      setSecondsLeft(focusSecs);

      if (settings.autoStartPomodoros) {
        playModeSound('focus', settings.soundEnabled);
        startTimeRef.current = new Date().toISOString();
        const nextEndTime = Date.now() + focusSecs * 1000;
        startTicking(nextEndTime);
        setRunning(true);
        pushTimerState(true, 'focus', nextEndTime, activeTaskId, sessionCount);
      } else {
        pushTimerState(false, 'focus', null, activeTaskId, sessionCount);
      }
    }
  }, [mode, sessionCount, activeTaskId, settings, addSession, incrementTaskPomodoro, clearTimer, durationFor, startTicking, pushTimerState]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) onSessionComplete();
  }, [secondsLeft, running, onSessionComplete]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    if (mode === 'focus' && !activeTaskId) return; // require a task for focus sessions
    playModeSound(mode, settings.soundEnabled);
    startTimeRef.current = new Date().toISOString();
    const endTime = Date.now() + secondsLeftRef.current * 1000;
    startTicking(endTime);
    setRunning(true);
    pushTimerState(true, mode, endTime, activeTaskId, sessionCount);
  }, [startTicking, mode, activeTaskId, settings.soundEnabled, sessionCount, pushTimerState]);

  const pause = useCallback(() => {
    clearTimer();
    setRunning(false);
    pushTimerState(false, mode, null, activeTaskId, sessionCount);
  }, [clearTimer, mode, activeTaskId, sessionCount, pushTimerState]);

  const reset = useCallback(() => {
    clearTimer();
    setRunning(false);
    setSecondsLeft(durationFor(mode));
    pushTimerState(false, mode, null, activeTaskId, sessionCount);
  }, [clearTimer, durationFor, mode, activeTaskId, sessionCount, pushTimerState]);

  const forceComplete = useCallback(() => {
    clearTimer();
    setRunning(false);

    const elapsed = startTimeRef.current
      ? Math.max(1, Math.round((Date.now() - new Date(startTimeRef.current).getTime()) / 60000))
      : 1;

    if (mode === 'focus') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      const activeTask = state.tasks.find(t => t.id === activeTaskId);
      if (activeTaskId && !activeTask?.completed) incrementTaskPomodoro(activeTaskId);

      addSession({
        id: randomId(),
        taskId: activeTaskId,
        date: todayStr(),
        startTime: startTimeRef.current ?? new Date().toISOString(),
        duration: elapsed,
        type: 'focus',
        completed: true,
      } as Session);

      const nextMode: TimerMode =
        newCount % settings.longBreakInterval === 0 ? 'long_break' : 'short_break';
      const nextSecs = durationFor(nextMode);
      setModeState(nextMode);
      setSecondsLeft(nextSecs);

      if (settings.autoStartBreaks) {
        startTimeRef.current = new Date().toISOString();
        const nextEndTime = Date.now() + nextSecs * 1000;
        startTicking(nextEndTime);
        setRunning(true);
        pushTimerState(true, nextMode, nextEndTime, activeTaskId, newCount);
      } else {
        pushTimerState(false, nextMode, null, activeTaskId, newCount);
      }
    } else {
      addSession({
        id: randomId(),
        taskId: null,
        date: todayStr(),
        startTime: startTimeRef.current ?? new Date().toISOString(),
        duration: elapsed,
        type: mode,
        completed: true,
      } as Session);

      const focusSecs = durationFor('focus');
      setModeState('focus');
      setSecondsLeft(focusSecs);

      if (settings.autoStartPomodoros) {
        playModeSound('focus', settings.soundEnabled);
        startTimeRef.current = new Date().toISOString();
        const nextEndTime = Date.now() + focusSecs * 1000;
        startTicking(nextEndTime);
        setRunning(true);
        pushTimerState(true, 'focus', nextEndTime, activeTaskId, sessionCount);
      } else {
        pushTimerState(false, 'focus', null, activeTaskId, sessionCount);
      }
    }
  }, [mode, sessionCount, activeTaskId, settings, addSession, incrementTaskPomodoro, clearTimer, durationFor, startTicking, pushTimerState]);

  const switchMode = useCallback((newMode: TimerMode) => {
    clearTimer();
    setRunning(false);
    setModeState(newMode);
    setSecondsLeft(durationFor(newMode));
    pushTimerState(false, newMode, null, activeTaskId, sessionCount);
  }, [clearTimer, durationFor, activeTaskId, sessionCount, pushTimerState]);

  const switchTask = useCallback((taskId: string | null) => {
    setActiveTaskId(taskId);
    // Push immediately so the other device shows the updated active task
    if (runningRef.current) {
      pushTimerState(true, mode, endTimeRef.current, taskId, sessionCount);
    }
  }, [mode, sessionCount, pushTimerState]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const totalSeconds = durationFor(mode);
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const value: TimerContextValue = {
    mode, running, display, progress, sessionCount, activeTaskId,
    switchTask, start, pause, reset, forceComplete, switchMode,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
