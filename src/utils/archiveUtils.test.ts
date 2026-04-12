import { describe, it, expect } from 'vitest';
import { getCutoffDate, partitionByDate, groupByYear, getArchiveYearsNeeded } from './archiveUtils';

// ─── getCutoffDate ─────────────────────────────────────────────────────────────

describe('getCutoffDate', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(getCutoffDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a date approximately 6 months in the past', () => {
    const cutoff = new Date(getCutoffDate());
    const now = new Date();
    const diffMs = now.getTime() - cutoff.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // 6 months ≈ 180–184 days depending on which months
    expect(diffDays).toBeGreaterThanOrEqual(178);
    expect(diffDays).toBeLessThanOrEqual(186);
  });

  it('is always strictly in the past', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(getCutoffDate() < today).toBe(true);
  });
});

// ─── partitionByDate ───────────────────────────────────────────────────────────

describe('partitionByDate', () => {
  const cutoff = '2025-10-01';

  const old1 = { id: 'a', date: '2025-09-30' };
  const old2 = { id: 'b', date: '2024-01-15' };
  const recent1 = { id: 'c', date: '2025-10-01' }; // exactly at cutoff → recent
  const recent2 = { id: 'd', date: '2026-01-01' };

  it('puts items with date < cutoff into old', () => {
    const { old } = partitionByDate([old1, old2, recent1, recent2], cutoff);
    expect(old.map(i => i.id)).toEqual(['a', 'b']);
  });

  it('puts items with date >= cutoff into recent', () => {
    const { recent } = partitionByDate([old1, old2, recent1, recent2], cutoff);
    expect(recent.map(i => i.id)).toEqual(['c', 'd']);
  });

  it('handles empty array', () => {
    const { recent, old } = partitionByDate([], cutoff);
    expect(recent).toHaveLength(0);
    expect(old).toHaveLength(0);
  });

  it('handles all items recent', () => {
    const { recent, old } = partitionByDate([recent1, recent2], cutoff);
    expect(recent).toHaveLength(2);
    expect(old).toHaveLength(0);
  });

  it('handles all items old', () => {
    const { recent, old } = partitionByDate([old1, old2], cutoff);
    expect(recent).toHaveLength(0);
    expect(old).toHaveLength(2);
  });
});

// ─── groupByYear ───────────────────────────────────────────────────────────────

describe('groupByYear', () => {
  const items = [
    { id: '1', date: '2024-03-01' },
    { id: '2', date: '2024-11-15' },
    { id: '3', date: '2025-01-10' },
    { id: '4', date: '2025-09-30' },
    { id: '5', date: '2023-06-20' },
  ];

  it('groups items by the year portion of date', () => {
    const result = groupByYear(items);
    expect(Object.keys(result).sort()).toEqual(['2023', '2024', '2025']);
    expect(result['2024'].map(i => i.id)).toEqual(['1', '2']);
    expect(result['2025'].map(i => i.id)).toEqual(['3', '4']);
    expect(result['2023'].map(i => i.id)).toEqual(['5']);
  });

  it('returns empty object for empty array', () => {
    expect(groupByYear([])).toEqual({});
  });

  it('single item in its own year bucket', () => {
    const result = groupByYear([{ id: 'x', date: '2020-06-01' }]);
    expect(result['2020']).toHaveLength(1);
  });
});

// ─── getArchiveYearsNeeded ────────────────────────────────────────────────────

describe('getArchiveYearsNeeded', () => {
  const cutoff = '2025-10-12';

  it('returns empty array when fromDate is at the cutoff', () => {
    expect(getArchiveYearsNeeded('2025-10-12', cutoff)).toEqual([]);
  });

  it('returns empty array when fromDate is after the cutoff', () => {
    expect(getArchiveYearsNeeded('2025-11-01', cutoff)).toEqual([]);
  });

  it('returns empty array when fromDate is empty', () => {
    expect(getArchiveYearsNeeded('', cutoff)).toEqual([]);
  });

  it('returns the cutoff year when fromDate is earlier in same year', () => {
    expect(getArchiveYearsNeeded('2025-01-01', cutoff)).toEqual(['2025']);
  });

  it('returns multiple years spanning across the cutoff year', () => {
    expect(getArchiveYearsNeeded('2023-06-01', cutoff)).toEqual(['2023', '2024', '2025']);
  });

  it('returns single prior year when fromDate is in a different year before cutoff', () => {
    expect(getArchiveYearsNeeded('2024-01-01', cutoff)).toEqual(['2024', '2025']);
  });

  it('returns only the from-year when fromDate and cutoff are in the same year', () => {
    expect(getArchiveYearsNeeded('2025-03-01', '2025-10-12')).toEqual(['2025']);
  });
});
