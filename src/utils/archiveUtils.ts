import type { Task, Session, Interruption } from '../types';

export interface ArchiveData {
  tasks: Task[];
  sessions: Session[];
  interruptions: Interruption[];
}

/** Returns the cutoff date string (6 months ago today, YYYY-MM-DD). Items with date < cutoff are archived. */
export function getCutoffDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

/** Splits an array of date-keyed items into recent (>= cutoffDate) and old (< cutoffDate). */
export function partitionByDate<T extends { date: string }>(
  items: T[],
  cutoffDate: string
): { recent: T[]; old: T[] } {
  const recent: T[] = [];
  const old: T[] = [];
  for (const item of items) {
    if (item.date < cutoffDate) {
      old.push(item);
    } else {
      recent.push(item);
    }
  }
  return { recent, old };
}

/** Groups items by the calendar year derived from item.date (YYYY-MM-DD). */
export function groupByYear<T extends { date: string }>(items: T[]): Record<string, T[]> {
  const byYear: Record<string, T[]> = {};
  for (const item of items) {
    const year = item.date.slice(0, 4);
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(item);
  }
  return byYear;
}

/**
 * Returns the list of archive years that must be loaded to cover a date range.
 * Returns [] if fromDate is at or after the cutoff (recent data only — no archive needed).
 */
export function getArchiveYearsNeeded(fromDate: string, cutoffDate: string): string[] {
  if (!fromDate || fromDate >= cutoffDate) return [];
  const fromYear = parseInt(fromDate.slice(0, 4), 10);
  const cutoffYear = parseInt(cutoffDate.slice(0, 4), 10);
  const years: string[] = [];
  for (let y = fromYear; y <= cutoffYear; y++) {
    years.push(String(y));
  }
  return years;
}
