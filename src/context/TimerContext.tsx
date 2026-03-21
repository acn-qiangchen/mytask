import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { Session } from '../types';
import { useApp } from '../hooks/useApp';
import { todayStr } from '../utils/formatters';

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

  const autoStart = useCallback((secs: number, enabled: boolean) => {
    if (!enabled) return;
    startTimeRef.current = new Date().toISOString();
    startTicking(Date.now() + secs * 1000);
    setRunning(true);
  }, [startTicking]);

  const onSessionComplete = useCallback(() => {
    clearTimer();
    setRunning(false);

    const newCount = mode === 'focus' ? sessionCount + 1 : sessionCount;
    if (mode === 'focus') {
      setSessionCount(newCount);
      if (activeTaskId) incrementTaskPomodoro(activeTaskId);

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
      setModeState(nextMode);
      const nextSecs = durationFor(nextMode);
      setSecondsLeft(nextSecs);

      autoStart(nextSecs, settings.autoStartBreaks);
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
      autoStart(focusSecs, settings.autoStartPomodoros);
    }
  }, [mode, sessionCount, activeTaskId, settings, addSession, incrementTaskPomodoro, clearTimer, durationFor, autoStart]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) onSessionComplete();
  }, [secondsLeft, running, onSessionComplete]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    if (mode === 'focus' && !activeTaskId) return; // require a task for focus sessions
    startTimeRef.current = new Date().toISOString();
    startTicking(Date.now() + secondsLeftRef.current * 1000);
    setRunning(true);
  }, [startTicking, mode, activeTaskId]);

  const pause = useCallback(() => {
    clearTimer();
    setRunning(false);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setRunning(false);
    setSecondsLeft(durationFor(mode));
  }, [clearTimer, durationFor, mode]);

  const forceComplete = useCallback(() => {
    clearTimer();
    setRunning(false);

    const elapsed = startTimeRef.current
      ? Math.max(1, Math.round((Date.now() - new Date(startTimeRef.current).getTime()) / 60000))
      : 1;

    if (mode === 'focus') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      if (activeTaskId) incrementTaskPomodoro(activeTaskId);

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

      autoStart(nextSecs, settings.autoStartBreaks);
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
      autoStart(focusSecs, settings.autoStartPomodoros);
    }
  }, [mode, sessionCount, activeTaskId, settings, addSession, incrementTaskPomodoro, clearTimer, durationFor, autoStart]);

  const switchMode = useCallback((newMode: TimerMode) => {
    clearTimer();
    setRunning(false);
    setModeState(newMode);
    setSecondsLeft(durationFor(newMode));
  }, [clearTimer, durationFor]);

  const switchTask = useCallback((taskId: string | null) => {
    setActiveTaskId(taskId);
  }, []);

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
