import { addDays, daysBetween } from './dates'
import { complementIntervals, intersectsAny, mergeIntervals } from './intervals'
import type { DateKey, Interval, Occurrence, TaskBlock } from './types'

/**
 * Free time is the whole product.
 *
 * A day is a window (08:00–23:00 by default) minus everything committed to it.
 * Every scheduling question reduces to asking these gaps for room, which is why
 * `buildSchedules` is the only expensive function here and everything else is a
 * linear scan over its output.
 */

/** The visible span of a day. Later this becomes a setting. */
export const DEFAULT_DAY_WINDOW: Interval = { start: 8 * 60, end: 23 * 60 }

export type DaySchedule = {
  date: DateKey
  window: Interval
  /** Merged, clipped to `window`. */
  busy: Interval[]
  /** Complement of `busy` inside `window`. */
  free: Interval[]
}

export type Slot = { date: DateKey; start: number; end: number }

export type NotBefore = { date: DateKey; minute: number }

/** Everything committed on one date: classes and task sessions alike. */
export function busyIntervals(
  date: DateKey,
  occurrences: Occurrence[],
  blocks: TaskBlock[],
): Interval[] {
  const intervals: Interval[] = []
  for (const occurrence of occurrences) {
    if (occurrence.date === date) {
      intervals.push({ start: occurrence.start, end: occurrence.end })
    }
  }
  for (const block of blocks) {
    if (block.date === date) {
      intervals.push({ start: block.start, end: block.end })
    }
  }
  return mergeIntervals(intervals)
}

export function buildDaySchedule(
  date: DateKey,
  occurrences: Occurrence[],
  blocks: TaskBlock[],
  window: Interval = DEFAULT_DAY_WINDOW,
): DaySchedule {
  const busy = busyIntervals(date, occurrences, blocks)
  return { date, window, busy, free: complementIntervals(busy, window) }
}

/** One `DaySchedule` per date in the inclusive range. */
export function buildSchedules(
  from: DateKey,
  to: DateKey,
  occurrences: Occurrence[],
  blocks: TaskBlock[],
  window: Interval = DEFAULT_DAY_WINDOW,
): DaySchedule[] {
  const span = daysBetween(from, to)
  if (span < 0) return []

  // Hard ceiling so a bad deadline cannot spin through a decade of days.
  const days = Math.min(span + 1, 400)
  return Array.from({ length: days }, (_, index) =>
    buildDaySchedule(addDays(from, index), occurrences, blocks, window),
  )
}

function gapsFrom(day: DaySchedule, notBefore?: NotBefore): Interval[] {
  if (!notBefore) return day.free
  if (day.date < notBefore.date) return []
  if (day.date > notBefore.date) return day.free
  return day.free
    .map((gap) => ({ start: Math.max(gap.start, notBefore.minute), end: gap.end }))
    .filter((gap) => gap.end > gap.start)
}

export function totalFreeMinutes(schedules: DaySchedule[]): number {
  return schedules.reduce(
    (total, day) =>
      total + day.free.reduce((sum, gap) => sum + (gap.end - gap.start), 0),
    0,
  )
}

/**
 * The earliest place a piece of work of `duration` fits, taking only the first
 * `duration` minutes of a longer gap.
 */
export function earliestFit(
  duration: number,
  schedules: DaySchedule[],
  notBefore?: NotBefore,
): Slot | null {
  if (duration <= 0) return null
  for (const day of schedules) {
    for (const gap of gapsFrom(day, notBefore)) {
      if (gap.end - gap.start >= duration) {
        return { date: day.date, start: gap.start, end: gap.start + duration }
      }
    }
  }
  return null
}

/**
 * Up to one candidate per day, earliest first. Deliberately spread across days
 * so the suggestions read as options rather than three variations of "now".
 */
export function suggestSlots(
  duration: number,
  schedules: DaySchedule[],
  limit = 3,
  notBefore?: NotBefore,
): Slot[] {
  if (duration <= 0) return []
  const slots: Slot[] = []
  for (const day of schedules) {
    if (slots.length >= limit) break
    const gap = gapsFrom(day, notBefore).find(
      (candidate) => candidate.end - candidate.start >= duration,
    )
    if (gap) {
      slots.push({ date: day.date, start: gap.start, end: gap.start + duration })
    }
  }
  return slots
}

/** Whether a specific range is clear of everything already booked. */
export function isRangeFree(
  date: DateKey,
  interval: Interval,
  occurrences: Occurrence[],
  blocks: TaskBlock[],
): boolean {
  return !intersectsAny(interval, busyIntervals(date, occurrences, blocks))
}

/**
 * Does the remaining work fit into the free time available before a deadline?
 *
 * Counts total free minutes rather than hunting for a single gap, because work
 * can legitimately be split across several sessions.
 */
export function fitsBefore(
  remainingMinutes: number,
  schedules: DaySchedule[],
): boolean {
  if (remainingMinutes <= 0) return true
  return totalFreeMinutes(schedules) >= remainingMinutes
}
