import { useEffect, useMemo, useState } from 'react'
import { clampWeekIndex, todayKey, weekDates, weekIndexFor } from '@/domain/dates'
import { buildSchedules } from '@/domain/free-time'
import { expandRange, expandWeek } from '@/domain/recurrence'
import type { DateKey, Interval, Occurrence } from '@/domain/types'
import { useTimetable } from './timetable-store'

/**
 * Derived views over the store.
 *
 * The store holds raw records only. Anything computed — occurrences for a week,
 * day schedules, free gaps — is built here with `useMemo` so that subscribers
 * get a stable reference and selection stays cheap.
 */

/** The week currently on screen, clamped into the term. */
export function useWeek() {
  const term = useTimetable((state) => state.term)
  const requested = useTimetable((state) => state.weekIndex)
  const entries = useTimetable((state) => state.entries)
  const exceptions = useTimetable((state) => state.exceptions)

  // `null` means the user has not navigated, so follow the week that contains
  // today — resolved against the persisted term, not the seed.
  const currentWeek = useMemo(
    () => clampWeekIndex(term, weekIndexFor(term, todayKey())),
    [term],
  )
  const weekIndex =
    requested === null ? currentWeek : clampWeekIndex(term, requested)

  const dates = useMemo(
    () => weekDates(term, weekIndex),
    [term, weekIndex],
  )

  const occurrences = useMemo(
    () => expandWeek(term, entries, exceptions, weekIndex),
    [term, entries, exceptions, weekIndex],
  )

  return { term, weekIndex, dates, occurrences }
}

/** Day schedules (busy + free) for an inclusive date range. */
export function useSchedules(from: DateKey, to: DateKey) {
  const term = useTimetable((state) => state.term)
  const entries = useTimetable((state) => state.entries)
  const exceptions = useTimetable((state) => state.exceptions)
  const blocks = useTimetable((state) => state.blocks)

  return useMemo(() => {
    const occurrences = expandRange(term, entries, exceptions, from, to)
    return buildSchedules(from, to, occurrences, blocks)
  }, [term, entries, exceptions, blocks, from, to])
}

/** Occurrences for an arbitrary range, for scheduling searches. */
export function useOccurrences(from: DateKey, to: DateKey): Occurrence[] {
  const term = useTimetable((state) => state.term)
  const entries = useTimetable((state) => state.entries)
  const exceptions = useTimetable((state) => state.exceptions)

  return useMemo(
    () => expandRange(term, entries, exceptions, from, to),
    [term, entries, exceptions, from, to],
  )
}

/** A clock that ticks, so the now-line can move without re-rendering the grid. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}

/** The teaching week that contains `date`, or `null` outside the term. */
export function useWeekOf(date: DateKey): number | null {
  const term = useTimetable((state) => state.term)
  return useMemo(() => {
    const index = weekIndexFor(term, date)
    return index >= 1 && index <= term.weekCount ? index : null
  }, [term, date])
}

/** Stable settings object; changes only when a preference changes. */
export function useSettings() {
  return useTimetable((state) => state.settings)
}

export function useTimeFormat() {
  return useTimetable((state) => state.settings.timeFormat)
}

/** The visible span of a day, from settings. */
export function useDayWindow(): Interval {
  const start = useTimetable((state) => state.settings.dayStart)
  const end = useTimetable((state) => state.settings.dayEnd)
  return useMemo(() => ({ start, end }), [start, end])
}
