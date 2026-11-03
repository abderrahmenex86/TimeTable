import { describe, expect, it } from 'vitest'
import {
  addDays,
  clampWeekIndex,
  daysBetween,
  endOfWeek,
  formatDayMonth,
  isDateKey,
  isWithinTerm,
  startOfWeek,
  todayKey,
  weekDates,
  weekIndexFor,
  weekStartDate,
  weekdayOf,
} from './dates'
import type { Term } from './types'

/** Monday 7 September 2026 — week 1. */
const term: Term = {
  id: 't1',
  name: 'Fall 2026',
  startDate: '2026-09-07',
  weekCount: 12,
}

describe('weekdayOf', () => {
  it('maps Monday to 1 and Sunday to 7', () => {
    expect(weekdayOf('2026-11-02')).toBe(1)
    expect(weekdayOf('2026-11-03')).toBe(2)
    expect(weekdayOf('2026-11-07')).toBe(6)
    expect(weekdayOf('2026-11-08')).toBe(7)
  })
})

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('handles leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01')
  })

  it('is stable across DST transitions', () => {
    // European DST: last Sunday of March and of October.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2026-03-01', 31)).toBe('2026-04-01')
    expect(addDays('2026-10-01', 31)).toBe('2026-11-01')
  })

  it('crosses year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })
})

describe('date keys', () => {
  it('validates shape and real calendar days', () => {
    expect(isDateKey('2026-11-03')).toBe(true)
    expect(isDateKey('2026-02-31')).toBe(false)
    expect(isDateKey('2026-13-01')).toBe(false)
    expect(isDateKey('3/11/2026')).toBe(false)
  })

  it('reads today from the local clock', () => {
    expect(todayKey(new Date(2026, 10, 3, 23, 59))).toBe('2026-11-03')
    // Local midnight must not roll back to the previous day.
    expect(todayKey(new Date(2026, 10, 3, 0, 0))).toBe('2026-11-03')
  })
})

describe('week boundaries', () => {
  it('snaps to Monday and Sunday', () => {
    expect(startOfWeek('2026-11-05')).toBe('2026-11-02')
    expect(endOfWeek('2026-11-05')).toBe('2026-11-08')
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02')
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02')
  })

  it('counts whole days between dates', () => {
    expect(daysBetween('2026-11-02', '2026-11-08')).toBe(6)
    expect(daysBetween('2026-11-08', '2026-11-02')).toBe(-6)
    expect(daysBetween('2026-11-02', '2026-11-02')).toBe(0)
  })
})

describe('term weeks', () => {
  it('numbers weeks from one', () => {
    expect(weekIndexFor(term, '2026-09-07')).toBe(1)
    expect(weekIndexFor(term, '2026-09-13')).toBe(1)
    expect(weekIndexFor(term, '2026-09-14')).toBe(2)
    expect(weekIndexFor(term, '2026-11-03')).toBe(9)
  })

  it('returns out-of-range indexes before and after the term', () => {
    expect(weekIndexFor(term, '2026-09-06')).toBe(0)
    expect(weekIndexFor(term, '2026-08-01')).toBeLessThan(0)
    expect(weekIndexFor(term, '2026-11-30')).toBe(13)
  })

  it('reports membership', () => {
    expect(isWithinTerm(term, 1)).toBe(true)
    expect(isWithinTerm(term, 12)).toBe(true)
    expect(isWithinTerm(term, 0)).toBe(false)
    expect(isWithinTerm(term, 13)).toBe(false)
  })

  it('round-trips a week index and its Monday', () => {
    expect(weekStartDate(term, 1)).toBe('2026-09-07')
    expect(weekStartDate(term, 9)).toBe('2026-11-02')
    expect(weekIndexFor(term, weekStartDate(term, 9))).toBe(9)
  })

  it('lists seven dates Monday first', () => {
    const dates = weekDates(term, 9)
    expect(dates).toHaveLength(7)
    expect(dates[0]).toBe('2026-11-02')
    expect(dates[6]).toBe('2026-11-08')
  })

  it('clamps into the term', () => {
    expect(clampWeekIndex(term, 0)).toBe(1)
    expect(clampWeekIndex(term, 40)).toBe(12)
    expect(clampWeekIndex(term, 5)).toBe(5)
  })
})

describe('formatDayMonth', () => {
  it('renders a short label', () => {
    expect(formatDayMonth('2026-11-05')).toBe('5 Nov')
  })
})
