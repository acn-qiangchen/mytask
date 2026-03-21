export interface Task {
  id: string;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  date: string; // YYYY-MM-DD
  completed: boolean;
  note?: string;
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
  settings: Settings;
  selectedDate: string; // YYYY-MM-DD
}
