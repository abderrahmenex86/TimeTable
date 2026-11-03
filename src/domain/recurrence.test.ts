import { describe, expect, it } from 'vitest'
import { expandRange, expandWeek, groupOccurrencesByDate } from './recurrence'
import type { EntryException, Term, TimetableEntry } from './types'

const term: Term = {
  id: 't1',
  name: 'Fall 2026',
  startDate: '2026-09-07',
  weekCount: 12,
}

const entries: TimetableEntry[] = [
  {
    id: 'linalg',
    subjectId: 'math',
    title: 'Linear Algebra',
    location: 'B3',
    recurrence: { kind: 'weekly', days: [1, 3], start: 540, end: 630, parity: 'all' },
  },
  {
    id: 'physics',
    subjectId: 'phys',
    title: 'Physics',
    recurrence: { kind: 'weekly', days: [2, 4], start: 660, end: 780, parity: 'odd' },
  },
  {
    id: 'lab',
    subjectId: 'phys',
    title: 'Physics Lab',
    recurrence: {
      kind: 'weekly',
      days: [5],
      start: 840,
      end: 1020,
      parity: 'all',
      weeks: { from: 2, to: 4 },
    },
  },
]

describe('expandWeek', () => {
  it('projects a weekly rule onto real dates', () => {
    const result = expandWeek(term, entries, [], 9)
    const linalg = result.filter((o) => o.entryId === 'linalg')
    expect(linalg).toHaveLength(2)
    expect(linalg.map((o) => o.date)).toEqual(['2026-11-02', '2026-11-04'])
  })

  it('carries subject, title and location through', () => {
    const [first] = expandWeek(term, entries, [], 9)
    expect(first).toMatchObject({
      entryId: 'linalg',
      subjectId: 'math',
      title: 'Linear Algebra',
      location: 'B3',
      start: 540,
      end: 630,
    })
  })

  it('only shows odd-parity entries in odd weeks', () => {
    const odd = expandWeek(term, entries, [], 9)
    expect(odd.some((o) => o.entryId === 'physics')).toBe(true)

    const even = expandWeek(term, entries, [], 10)
    expect(even.some((o) => o.entryId === 'physics')).toBe(false)
  })

  it('respects an explicit week range', () => {
    const weekOne = expandWeek(term, entries, [], 1)
    expect(weekOne.some((o) => o.entryId === 'lab')).toBe(false)

    const weekThree = expandWeek(term, entries, [], 3)
    expect(weekThree.some((o) => o.entryId === 'lab')).toBe(true)

    const weekFive = expandWeek(term, entries, [], 5)
    expect(weekFive.some((o) => o.entryId === 'lab')).toBe(false)
  })

  it('returns nothing outside the term', () => {
    expect(expandWeek(term, entries, [], 0)).toEqual([])
    expect(expandWeek(term, entries, [], 13)).toEqual([])
  })

  it('cancels a single session without touching the series', () => {
    const exceptions: EntryException[] = [
      { entryId: 'linalg', date: '2026-11-02', kind: 'cancelled' },
    ]
    const result = expandWeek(term, entries, exceptions, 9)
    const linalg = result.filter((o) => o.entryId === 'linalg')

    expect(linalg.map((o) => o.date)).toEqual(['2026-11-04'])
    // The following week is untouched.
    const next = expandWeek(term, entries, exceptions, 10)
    expect(next.filter((o) => o.entryId === 'linalg')).toHaveLength(2)
  })

  it('ignores an exception for a different entry', () => {
    const exceptions: EntryException[] = [
      { entryId: 'physics', date: '2026-11-02', kind: 'cancelled' },
    ]
    expect(
      expandWeek(term, entries, exceptions, 9).filter(
        (o) => o.entryId === 'linalg',
      ),
    ).toHaveLength(2)
  })

  it('emits one occurrence for a rule with duplicate days', () => {
    const duplicate: TimetableEntry = {
      id: 'dup',
      subjectId: 'math',
      title: 'Duplicate',
      recurrence: { kind: 'weekly', days: [1, 1], start: 540, end: 600, parity: 'all' },
    }
    expect(expandWeek(term, [duplicate], [], 9)).toHaveLength(1)
  })

  it('skips rules whose end is not after their start', () => {
    const broken: TimetableEntry = {
      id: 'broken',
      subjectId: 'math',
      title: 'Broken',
      recurrence: { kind: 'weekly', days: [1], start: 600, end: 600, parity: 'all' },
    }
    expect(expandWeek(term, [broken], [], 9)).toEqual([])
  })

  it('sorts by date then start time', () => {
    const result = expandWeek(term, entries, [], 9)
    const keys = result.map((o) => `${o.date}T${String(o.start).padStart(4, '0')}`)
    expect([...keys].sort()).toEqual(keys)
  })
})

describe('expandRange', () => {
  it('spans weeks and clips to the range', () => {
    const result = expandRange(term, entries, [], '2026-11-02', '2026-11-08')
    expect(result).toHaveLength(expandWeek(term, entries, [], 9).length)
  })

  it('crosses a week boundary', () => {
    const result = expandRange(term, entries, [], '2026-11-04', '2026-11-10')
    const dates = [...new Set(result.map((o) => o.date))]
    expect(dates).toContain('2026-11-04')
    expect(dates).toContain('2026-11-09')
    expect(dates).not.toContain('2026-11-03')
  })

  it('is empty when the range is inverted', () => {
    expect(expandRange(term, entries, [], '2026-11-08', '2026-11-02')).toEqual([])
  })
})

describe('weeks that do not start on Monday', () => {
  const sundayTerm: Term = {
    id: 't2',
    name: 'Sunday term',
    startDate: '2026-11-01', // Sunday
    weekCount: 12,
  }

  const monday: TimetableEntry[] = [
    {
      id: 'monday',
      subjectId: 's',
      title: 'Monday lecture',
      recurrence: { kind: 'weekly', days: [1], start: 540, end: 600, parity: 'all' },
    },
  ]

  it('resolves a weekday against the real date, not the column index', () => {
    // Regression: this used to land on 2026-11-01 because the code assumed
    // dates[0] was always Monday.
    const [occurrence] = expandWeek(sundayTerm, monday, [], 1)
    expect(occurrence.date).toBe('2026-11-02')
  })

  it('handles a Sunday rule in a Sunday-starting week', () => {
    const sunday: TimetableEntry[] = [
      {
        id: 'sunday',
        subjectId: 's',
        title: 'Sunday lecture',
        recurrence: { kind: 'weekly', days: [7], start: 540, end: 600, parity: 'all' },
      },
    ]
    const [occurrence] = expandWeek(sundayTerm, sunday, [], 1)
    expect(occurrence.date).toBe('2026-11-01')
  })

  it('still honours week parity and exceptions', () => {
    const odd: TimetableEntry[] = [
      {
        ...monday[0],
        id: 'odd',
        recurrence: { kind: 'weekly', days: [1], start: 540, end: 600, parity: 'odd' },
      },
    ]
    expect(expandWeek(sundayTerm, odd, [], 1)).toHaveLength(1)
    expect(expandWeek(sundayTerm, odd, [], 2)).toHaveLength(0)

    const result = expandWeek(
      sundayTerm,
      monday,
      [{ entryId: 'monday', date: '2026-11-02', kind: 'cancelled' }],
      1,
    )
    expect(result).toHaveLength(0)
  })
})

describe('one-off sessions', () => {
  const openDay: TimetableEntry[] = [
    {
      id: 'open-day',
      subjectId: 'personal',
      title: 'Open day',
      recurrence: { kind: 'once', date: '2026-11-07', start: 600, end: 780 },
    },
  ]

  it('appears in the week that contains its date', () => {
    // Week 9 runs Mon 2 Nov – Sun 8 Nov 2026.
    const result = expandWeek(term, openDay, [], 9)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-11-07')
  })

  it('appears in exactly one week of the term', () => {
    const weeks = Array.from({ length: term.weekCount }, (_, i) =>
      expandWeek(term, openDay, [], i + 1),
    )
    const total = weeks.reduce((sum, week) => sum + week.length, 0)
    expect(total).toBe(1)
  })

  it('is absent from neighbouring weeks', () => {
    expect(expandWeek(term, openDay, [], 8)).toEqual([])
    expect(expandWeek(term, openDay, [], 10)).toEqual([])
  })

  it('carries its own time and details', () => {
    const [occurrence] = expandWeek(term, openDay, [], 9)
    expect(occurrence).toMatchObject({
      title: 'Open day',
      subjectId: 'personal',
      start: 600,
      end: 780,
    })
  })

  it('can still be cancelled', () => {
    const result = expandWeek(
      term,
      openDay,
      [{ entryId: 'open-day', date: '2026-11-07', kind: 'cancelled' }],
      9,
    )
    expect(result).toEqual([])
  })

  it('ignores week parity entirely', () => {
    // Even weeks would exclude a parity rule; a one-off has no parity to check.
    const evenWeek = expandWeek(term, openDay, [], 10)
    expect(evenWeek).toEqual([])
    expect(expandWeek(term, openDay, [], 9)).toHaveLength(1)
  })

  it('shows up through expandRange', () => {
    const result = expandRange(term, openDay, [], '2026-11-01', '2026-11-14')
    expect(result).toHaveLength(1)
  })
})

describe('groupOccurrencesByDate', () => {
  it('buckets by day', () => {
    const grouped = groupOccurrencesByDate(expandWeek(term, entries, [], 9))
    expect(grouped.get('2026-11-02')).toHaveLength(1)
    expect(grouped.get('2026-11-04')).toHaveLength(1)
    expect(grouped.get('2026-11-03')).toHaveLength(1)
  })
})
