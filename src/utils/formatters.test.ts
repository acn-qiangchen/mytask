import { describe, it, expect, vi, afterEach } from 'vitest';
import { todayStr, formatDate, getLast7Days, getLast30Days, formatMinutes, shortDate } from './formatters';

afterEach(() => {
  vi.useRealTimers();
});

// ─── localDateStr (via todayStr / formatDate) ─────────────────────────────────

describe('todayStr', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = todayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses local time, not UTC — matches getFullYear/getMonth/getDate', () => {
    // Freeze time to a fixed Date
    const fixed = new Date(2026, 3, 2, 9, 30, 0); // Apr 2 2026, 09:30 local time
    vi.useFakeTimers();
    vi.setSystemTime(fixed);

    expect(todayStr()).toBe('2026-04-02');
  });

  /**
   * Regression test for the UTC bug: at 00:30 local time on April 2,
   * .toISOString() could return April 1 in UTC+X timezones (the old broken
   * behaviour). This test pins the local date independently of UTC offset.
   */
  it('returns local date even at midnight boundary (regression: was UTC-based)', () => {
    // Simulate midnight: Jan 1 2026 00:05 local time
    const midnight = new Date(2026, 0, 1, 0, 5, 0); // Jan 1 2026, 00:05 local
    vi.useFakeTimers();
    vi.setSystemTime(midnight);

    // Local date must be Jan 1 regardless of UTC offset
    expect(todayStr()).toBe('2026-01-01');
  });
});

describe('formatDate', () => {
  it('returns YYYY-MM-DD for a local date', () => {
    const d = new Date(2026, 11, 25, 10, 0, 0); // Dec 25 2026 local
    expect(formatDate(d)).toBe('2026-12-25');
  });

  it('pads month and day with leading zeros', () => {
    const d = new Date(2026, 0, 5, 8, 0, 0); // Jan 5 2026 local
    expect(formatDate(d)).toBe('2026-01-05');
  });

  it('uses local day, not UTC day', () => {
    // Create a date at local midnight — its UTC representation could be the previous day
    const d = new Date(2026, 2, 15, 0, 30, 0); // Mar 15 2026 00:30 local
    // The local date must always be Mar 15 regardless of UTC offset
    expect(formatDate(d)).toBe('2026-03-15');
  });
});

// ─── getLast7Days / getLast30Days ─────────────────────────────────────────────

describe('getLast7Days', () => {
  it('returns exactly 7 entries', () => {
    expect(getLast7Days()).toHaveLength(7);
  });

  it('all entries match YYYY-MM-DD format', () => {
    for (const d of getLast7Days()) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('last entry is today in local time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 2, 14, 0, 0)); // Apr 2 2026 local

    const days = getLast7Days();
    expect(days[6]).toBe('2026-04-02');
    expect(days[0]).toBe('2026-03-27');
  });

  it('entries are in ascending chronological order', () => {
    const days = getLast7Days();
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i - 1]).toBe(true);
    }
  });
});

describe('getLast30Days', () => {
  it('returns exactly 30 entries', () => {
    expect(getLast30Days()).toHaveLength(30);
  });

  it('last entry is today in local time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 2, 14, 0, 0)); // Apr 2 2026 local

    const days = getLast30Days();
    expect(days[29]).toBe('2026-04-02');
  });

  it('entries are in ascending chronological order', () => {
    const days = getLast30Days();
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i - 1]).toBe(true);
    }
  });
});

// ─── formatMinutes ────────────────────────────────────────────────────────────

describe('formatMinutes', () => {
  it('shows minutes only when under 60', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(0)).toBe('0m');
  });

  it('shows hours and minutes when 60 or more', () => {
    expect(formatMinutes(60)).toBe('1h 0m');
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(125)).toBe('2h 5m');
  });
});

// ─── shortDate ────────────────────────────────────────────────────────────────

describe('shortDate', () => {
  it('parses YYYY-MM-DD as local date (not UTC)', () => {
    // "2026-04-02" appended with T00:00:00 avoids UTC midnight shift
    const result = shortDate('2026-04-02');
    expect(result).toContain('Apr');
    expect(result).toContain('2');
  });
});
