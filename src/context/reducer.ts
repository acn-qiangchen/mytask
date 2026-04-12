import type { AppState, Task, Session, Settings, Interruption, Ticket } from '../types';

export type Action =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'CLEAR_COMPLETED_TASKS'; payload: string }  // payload = date string
  | { type: 'ADD_SESSION'; payload: Session }
  | { type: 'ADD_INTERRUPTION'; payload: Interruption }
  | { type: 'INCREMENT_TASK_POMODORO'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Settings }
  | { type: 'SET_DATE'; payload: string }
  | { type: 'REORDER_TASKS'; payload: string[] }  // ordered array of task IDs
  | { type: 'ADD_TICKET'; payload: Ticket }
  | { type: 'UPDATE_TICKET'; payload: Ticket }
  | { type: 'DELETE_TICKET'; payload: string };  // payload = ticket id

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload], updatedAt: new Date().toISOString() };

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t),
        updatedAt: new Date().toISOString(),
      };

    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload), updatedAt: new Date().toISOString() };

    case 'CLEAR_COMPLETED_TASKS':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.date === action.payload && t.completed && !t.archivedAt
            ? { ...t, archivedAt: new Date().toISOString() }
            : t
        ),
        updatedAt: new Date().toISOString(),
      };

    case 'ADD_SESSION':
      return { ...state, sessions: [...state.sessions, action.payload], updatedAt: new Date().toISOString() };

    case 'ADD_INTERRUPTION':
      return { ...state, interruptions: [...(state.interruptions ?? []), action.payload], updatedAt: new Date().toISOString() };

    case 'INCREMENT_TASK_POMODORO':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload
            ? { ...t, completedPomodoros: t.completedPomodoros + 1 }
            : t
        ),
        updatedAt: new Date().toISOString(),
      };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: action.payload, updatedAt: new Date().toISOString() };

    case 'SET_DATE':
      return { ...state, selectedDate: action.payload };

    case 'REORDER_TASKS': {
      const idToOrder = new Map(action.payload.map((id, i) => [id, i]));
      return {
        ...state,
        tasks: state.tasks.map(t =>
          idToOrder.has(t.id) ? { ...t, order: idToOrder.get(t.id) } : t
        ),
        updatedAt: new Date().toISOString(),
      };
    }

    case 'ADD_TICKET':
      return { ...state, tickets: [...(state.tickets ?? []), action.payload], updatedAt: new Date().toISOString() };

    case 'UPDATE_TICKET':
      return {
        ...state,
        tickets: (state.tickets ?? []).map(tk => tk.id === action.payload.id ? action.payload : tk),
        updatedAt: new Date().toISOString(),
      };

    case 'DELETE_TICKET':
      return {
        ...state,
        tickets: (state.tickets ?? []).filter(tk => tk.id !== action.payload),
        // clear ticketId from tasks that referenced this ticket
        tasks: state.tasks.map(t => t.ticketId === action.payload ? { ...t, ticketId: undefined } : t),
        updatedAt: new Date().toISOString(),
      };

    default:
      return state;
  }
}
