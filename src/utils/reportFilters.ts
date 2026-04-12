import type { Task, Session } from '../types';

/**
 * Filter tasks by whether they have focus sessions within the given date range.
 * Uses session.date (when work happened) rather than task.date (when planned).
 * When no date filter is set, defaults to sessions on today.
 */
export function filterTasksBySessionDates(
  tasks: Task[],
  focusSessions: Session[],
  fromDate: string,
  toDate: string,
  today: string,
): Task[] {
  const hasDateFilter = fromDate || toDate;
  const sessionTaskIds = new Set(
    focusSessions
      .filter(s => {
        if (hasDateFilter) {
          return (!fromDate || s.date >= fromDate) && (!toDate || s.date <= toDate);
        }
        return s.date === today;
      })
      .map(s => s.taskId)
      .filter((id): id is string => id !== null),
  );
  return tasks.filter(task => sessionTaskIds.has(task.id));
}
