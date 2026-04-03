export interface Task {
  id: string;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  date: string; // YYYY-MM-DD
  completed: boolean;
  note?: string;
  order?: number;
  createdAt: string;
  completedAt?: string;  // ISO timestamp — set when task is marked complete
  archivedAt?: string;   // ISO timestamp — set when task is cleared from the day view
}

export interface Session {
  id: string;
  taskId: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO timestamp
  duration: number; // minutes
  type: 'focus' | 'short_break' | 'long_break';
  completed: boolean;
}

export interface Interruption {
  id: string;
  taskId: string | null;
  date: string;     // YYYY-MM-DD
  pausedAt: string; // ISO timestamp when the pause occurred
  reason: string;   // user-selected or typed; empty string if no reason given
}

export interface Settings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
}

export interface AppState {
  tasks: Task[];
  sessions: Session[];
  interruptions: Interruption[];
  settings: Settings;
  selectedDate: string; // YYYY-MM-DD
  updatedAt?: string;   // ISO timestamp — set on every local mutation; used for merge conflict resolution
}
