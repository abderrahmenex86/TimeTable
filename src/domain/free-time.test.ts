import { describe, expect, it } from 'vitest'
import {
  busyIntervals,
  buildDaySchedule,
  buildSchedules,
  earliestFit,
  fitsBefore,
  isRangeFree,
  suggestSlots,
  totalFreeMinutes,
} from './free-time'
import type { Occurrence, TaskBlock } from './types'

const DAY = { start: 480, end: 1380 } // 08:00–23:00

const occurrence = (date: string, start: number, end: number): Occurrence => ({
  entryId: 'e1',
  subjectId: 's1',
  title: 'Linear Algebra',
  date,
  start,
  end,
})

const block = (date: string, start: number, end: number): TaskBlock => ({
  id: `b-${date}-${start}`,
  taskId: 't1',
  date,
  start,
  end,
})

describe('busyIntervals', () => {
  it('merges classes and task sessions on one date', () => {
    const busy = busyIntervals(
      '2026-11-02',
      [occurrence('2026-11-02', 540, 630)],
      [block('2026-11-02', 660, 720)],
    )
    expect(busy).toEqual([
      { start: 540, end: 630 },
      { start: 660, end: 720 },
    ])
  })

  it('ignores other dates', () => {
    expect(
      busyIntervals('2026-11-02', [occurrence('2026-11-03', 540, 630)], []),
    ).toEqual([])
  })
})

describe('buildDaySchedule', () => {
  it('computes gaps around the day plan', () => {
    const day = buildDaySchedule(
      '2026-11-02',
      [occurrence('2026-11-02', 540, 630)],
      [block('2026-11-02', 660, 720)],
      DAY,
    )
    expect(day.free).toEqual([
      { start: 480, end: 540 },
      { start: 630, end: 660 },
      { start: 720, end: 1380 },
    ])
  })

  it('reports a fully booked day as having no free time', () => {
    const day = buildDaySchedule(
      '2026-11-02',
      [occurrence('2026-11-02', 400, 1500)],
      [],
      DAY,
    )
    expect(day.free).toEqual([])
  })
})

describe('buildSchedules', () => {
  it('produces one schedule per inclusive date', () => {
    const schedules = buildSchedules(
      '2026-11-02',
      '2026-11-08',
      [],
      [],
      DAY,
    )
    expect(schedules).toHaveLength(7)
    expect(schedules[0].date).toBe('2026-11-02')
    expect(schedules[6].date).toBe('2026-11-08')
  })

  it('is empty for an inverted range', () => {
    expect(buildSchedules('2026-11-08', '2026-11-02', [], [], DAY)).toEqual([])
  })

  it('caps runaway ranges', () => {
    const schedules = buildSchedules('2026-01-01', '2030-01-01', [], [], DAY)
    expect(schedules.length).toBeLessThanOrEqual(400)
  })
})

describe('earliestFit', () => {
  const schedules = buildSchedules(
    '2026-11-02',
    '2026-11-03',
    [occurrence('2026-11-02', 540, 630)],
    [block('2026-11-02', 660, 720)],
    DAY,
  )

  it('takes the first gap long enough for the work', () => {
    expect(earliestFit(90, schedules)).toEqual({
      date: '2026-11-02',
      start: 720,
      end: 810,
    })
  })

  it('falls through to the next day when today cannot hold it', () => {
    const slot = earliestFit(700, schedules)
    expect(slot?.date).toBe('2026-11-03')
    expect(slot?.start).toBe(480)
  })

  it('returns null when nothing fits at all', () => {
    const packed = buildSchedules(
      '2026-11-02',
      '2026-11-02',
      [occurrence('2026-11-02', 0, 1440)],
      [],
      DAY,
    )
    expect(earliestFit(30, packed)).toBeNull()
  })

  it('rejects a zero or negative duration', () => {
    expect(earliestFit(0, schedules)).toBeNull()
    expect(earliestFit(-30, schedules)).toBeNull()
  })

  it('honours a not-before cursor on the same day', () => {
    const slot = earliestFit(60, schedules, {
      date: '2026-11-02',
      minute: 1300,
    })
    expect(slot).toEqual({ date: '2026-11-02', start: 1300, end: 1360 })
  })

  it('skips days before the cursor entirely', () => {
    const slot = earliestFit(90, schedules, {
      date: '2026-11-03',
      minute: 0,
    })
    expect(slot?.date).toBe('2026-11-03')
  })
})

describe('suggestSlots', () => {
  const schedules = buildSchedules('2026-11-02', '2026-11-06', [], [], DAY)

  it('returns one candidate per day, earliest first', () => {
    const slots = suggestSlots(60, schedules, 3)
    expect(slots).toHaveLength(3)
    expect(slots.map((slot) => slot.date)).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
    ])
  })

  it('respects the limit', () => {
    expect(suggestSlots(60, schedules, 1)).toHaveLength(1)
  })

  it('returns nothing for a non-positive duration', () => {
    expect(suggestSlots(0, schedules)).toEqual([])
  })
})

describe('totalFreeMinutes', () => {
  it('sums the gaps', () => {
    const schedules = buildSchedules(
      '2026-11-02',
      '2026-11-02',
      [occurrence('2026-11-02', 540, 630)],
      [],
      DAY,
    )
    expect(totalFreeMinutes(schedules)).toBe(900 - 90)
  })
})

describe('fitsBefore', () => {
  it('is true when there is enough total room', () => {
    const schedules = buildSchedules('2026-11-02', '2026-11-02', [], [], DAY)
    expect(fitsBefore(900, schedules)).toBe(true)
    expect(fitsBefore(901, schedules)).toBe(false)
  })

  it('treats already-finished work as fitting', () => {
    expect(fitsBefore(0, [])).toBe(true)
  })
})

describe('isRangeFree', () => {
  const occurrences = [occurrence('2026-11-02', 540, 630)]

  it('is false when the range collides with a class', () => {
    expect(
      isRangeFree('2026-11-02', { start: 600, end: 660 }, occurrences, []),
    ).toBe(false)
  })

  it('is true when the range starts exactly at the end of a class', () => {
    expect(
      isRangeFree('2026-11-02', { start: 630, end: 690 }, occurrences, []),
    ).toBe(true)
  })
})
