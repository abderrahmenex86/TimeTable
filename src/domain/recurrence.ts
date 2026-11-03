import { addDays, isWithinTerm, weekDates, weekIndexFor } from './dates'
import type {
  DateKey,
  EntryException,
  Occurrence,
  Term,
  TimetableEntry,
  WeekParity,
  WeekRange,
} from './types'

/**
 * Rules → occurrences.
 *
 * An occurrence is always derived. Nothing here reads or writes a store, so
 * changing a class time updates every future week at once, and cancelling one
 * session leaves the other twenty-three alone.
 */

function matchesParity(parity: WeekParity, weekIndex: number): boolean {
  if (parity === 'all') return true
  const isOdd = weekIndex % 2 === 1
  return parity === 'odd' ? isOdd : !isOdd
}

function matchesWeekRange(weeks: WeekRange | undefined, weekIndex: number) {
  if (!weeks) return true
  return weekIndex >= weeks.from && weekIndex <= weeks.to
}

function byTime(a: Occurrence, b: Occurrence): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  if (a.start !== b.start) return a.start - b.start
  return a.title.localeCompare(b.title)
}

/**
 * Every occurrence in one teaching week. Returns an empty list for week
 * indexes outside the term, which is what keeps the week picker honest.
 */
export function expandWeek(
  term: Term,
  entries: TimetableEntry[],
  exceptions: EntryException[],
  weekIndex: number,
): Occurrence[] {
  if (!isWithinTerm(term, weekIndex)) return []

  const cancelled = new Set(
    exceptions
      .filter((exception) => exception.kind === 'cancelled')
      .map((exception) => `${exception.entryId}|${exception.date}`),
  )

  const dates = weekDates(term, weekIndex)
  const occurrences: Occurrence[] = []

  for (const entry of entries) {
    const { recurrence } = entry
    if (recurrence.end <= recurrence.start) continue
    if (!matchesParity(recurrence.parity, weekIndex)) continue
    if (!matchesWeekRange(recurrence.weeks, weekIndex)) continue

    // A malformed entry with duplicate days should still only appear once.
    for (const day of new Set(recurrence.days)) {
      const date = dates[day - 1]
      if (!date) continue
      if (cancelled.has(`${entry.id}|${date}`)) continue

      occurrences.push({
        entryId: entry.id,
        subjectId: entry.subjectId,
        title: entry.title,
        location: entry.location,
        date,
        start: recurrence.start,
        end: recurrence.end,
      })
    }
  }

  return occurrences.sort(byTime)
}

/**
 * Occurrences across an arbitrary inclusive date range. Used when asking
 * "does this task fit before Friday?" — the window rarely aligns to a week.
 */
export function expandRange(
  term: Term,
  entries: TimetableEntry[],
  exceptions: EntryException[],
  from: DateKey,
  to: DateKey,
): Occurrence[] {
  if (to < from) return []

  const firstWeek = weekIndexFor(term, from)
  const lastWeek = weekIndexFor(term, to)
  const collected: Occurrence[] = []

  for (let week = firstWeek; week <= lastWeek; week += 1) {
    for (const occurrence of expandWeek(term, entries, exceptions, week)) {
      if (occurrence.date >= from && occurrence.date <= to) {
        collected.push(occurrence)
      }
    }
  }

  return collected.sort(byTime)
}

export function occurrencesOn(
  occurrences: Occurrence[],
  date: DateKey,
): Occurrence[] {
  return occurrences.filter((occurrence) => occurrence.date === date)
}

export function groupOccurrencesByDate(
  occurrences: Occurrence[],
): Map<DateKey, Occurrence[]> {
  const map = new Map<DateKey, Occurrence[]>()
  for (const occurrence of occurrences) {
    const bucket = map.get(occurrence.date)
    if (bucket) bucket.push(occurrence)
    else map.set(occurrence.date, [occurrence])
  }
  return map
}

/** Convenience for the week stepper: which week does this date fall in? */
export function weekIndexOfDate(term: Term, date: DateKey): number {
  return weekIndexFor(term, date)
}

/** Monday of week `weekIndex`, clamped into the term. */
export function weekAnchor(term: Term, weekIndex: number): DateKey {
  return addDays(term.startDate, (weekIndex - 1) * 7)
}
