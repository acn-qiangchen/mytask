import { useState, useEffect, useRef, useCallback } from 'react';
import type { Session } from '../types';
import { useApp } from './useApp';
import { todayStr } from '../utils/formatters';

export type TimerMode = 'focus' | 'short_break' | 'long_break';

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export function useTimer() {
  const { state, addSession, incrementTaskPomodoro } = useApp();
  const { settings } = state;

  const durationFor = useCallback((mode: TimerMode): number => {
    if (mode === 'focus') return settings.focusDuration * 60;
    if (mode === 'short_break') return settings.shortBreakDuration * 60;
    return settings.longBreakDuration * 60;
  }, [settings]);

  const [mode, setModeState] = useState<TimerMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(() => durationFor('focus'));
  const [running, setRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const startTimeRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // When settings change, reset timer to new duration (only if not running)
  useEffect(() => {
    if (!running) {
      setSecondsLeft(durationFor(mode));
    }
  }, [settings, mode, running, durationFor]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const onSessionComplete = useCallback(() => {
    clearTimer();
    setRunning(false);

    const newCount = mode === 'focus' ? sessionCount + 1 : sessionCount;
    if (mode === 'focus') {
      setSessionCount(newCount);
      if (activeTaskId) incrementTaskPomodoro(activeTaskId);

      const session: Session = {
        id: randomId(),
        taskId: activeTaskId,
        date: todayStr(),
        startTime: startTimeRef.current ?? new Date().toISOString(),
        duration: settings.focusDuration,
        type: 'focus',
        completed: true,
      };
      addSession(session);

      // Determine next mode
      const nextMode: TimerMode =
        newCount % settings.longBreakInterval === 0 ? 'long_break' : 'short_break';
      setModeState(nextMode);
      setSecondsLeft(durationFor(nextMode));

      if (settings.autoStartBreaks) {
        startTimeRef.current = new Date().toISOString();
        intervalRef.current = setInterval(() => setSecondsLeft(s => s - 1), 1000);
        setRunning(true);
      }
    } else {
      const session: Session = {
        id: randomId(),
        taskId: null,
        date: todayStr(),
        startTime: startTimeRef.current ?? new Date().toISOString(),
        duration: mode === 'short_break' ? settings.shortBreakDuration : settings.longBreakDuration,
        type: mode,
        completed: true,
      };
      addSession(session);

      setModeState('focus');
      setSecondsLeft(durationFor('focus'));

      if (settings.autoStartPomodoros) {
        startTimeRef.current = new Date().toISOString();
        intervalRef.current = setInterval(() => setSecondsLeft(s => s - 1), 1000);
        setRunning(true);
      }
    }
  }, [
    mode, sessionCount, activeTaskId, settings,
    addSession, incrementTaskPomodoro, clearTimer, durationFor,
  ]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) {
      onSessionComplete();
    }
  }, [secondsLeft, running, onSessionComplete]);

  const start = useCallback(() => {
    if (running) return;
    startTimeRef.current = new Date().toISOString();
    setRunning(true);
    intervalRef.current = setInterval(() => setSecondsLeft(s => s - 1), 1000);
  }, [running]);

  const pause = useCallback(() => {
    clearTimer();
    setRunning(false);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setRunning(false);
    setSecondsLeft(durationFor(mode));
  }, [clearTimer, durationFor, mode]);

  const switchMode = useCallback((newMode: TimerMode) => {
    clearTimer();
    setRunning(false);
    setModeState(newMode);
    setSecondsLeft(durationFor(newMode));
  }, [clearTimer, durationFor]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  const totalSeconds = durationFor(mode);
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    mode,
    running,
    display,
    progress,
    sessionCount,
    activeTaskId,
    setActiveTaskId,
    start,
    pause,
    reset,
    switchMode,
  };
}
