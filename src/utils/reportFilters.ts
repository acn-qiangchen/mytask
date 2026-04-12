import type { Task, Session, Interruption } from '../types';

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

/**
 * Group interruptions by reason and return them sorted by count descending.
 * Interruptions with an empty reason are grouped under noReasonLabel.
 */
export function groupInterruptionsByReason(
  interruptions: Interruption[],
  noReasonLabel: string,
): { title: string; count: number }[] {
  if (interruptions.length === 0) return [];
  const byReason: Record<string, number> = {};
  for (const i of interruptions) {
    const key = i.reason.trim() || noReasonLabel;
    byReason[key] = (byReason[key] ?? 0) + 1;
  }
  return Object.entries(byReason)
    .sort((a, b) => b[1] - a[1])
    .map(([title, count]) => ({ title, count }));
}
