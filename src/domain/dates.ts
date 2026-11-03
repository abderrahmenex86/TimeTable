import type { DateKey, Term, Weekday } from './types'

/**
 * Calendar-date arithmetic on plain `YYYY-MM-DD` strings.
 *
 * Internally we build a UTC `Date` at midnight and only ever read it back with
 * `getUTC*`. Constructing and reading in the same frame means DST transitions
 * cannot move a date: there is no local time involved at all.
 *
 * The one exception is `todayKey()`, which deliberately reads the *local*
 * clock — "today" is a wall-clock concept for the person looking at the app.
 */

const DAY_MS = 86_400_000

const pad = (n: number) => (n < 10 ? `0${n}` : String(n))

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isDateKey(value: string): boolean {
  return ISO_DATE.test(value) && toUTC(value) !== null
}

export function makeDateKey(year: number, month: number, day: number): DateKey {
  return `${year}-${pad(month)}-${pad(day)}`
}

function toUTC(key: DateKey): Date | null {
  const match = ISO_DATE.exec(key)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  // Reject rollovers like 2026-02-31.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date
}

function fromUTC(date: Date): DateKey {
  return makeDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  )
}

/** Local calendar date for a `Date` — the only place local time is read. */
export function todayKey(now: Date = new Date()): DateKey {
  return makeDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/** Local minute-of-day for a `Date`. */
export function nowMinute(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes()
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = toUTC(key)
  if (!date) throw new Error(`Invalid date key: ${key}`)
  return fromUTC(new Date(date.getTime() + days * DAY_MS))
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: DateKey, to: DateKey): number {
  const a = toUTC(from)
  const b = toUTC(to)
  if (!a || !b) throw new Error(`Invalid date key: ${!a ? from : to}`)
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

/** 1 = Monday … 7 = Sunday. */
export function weekdayOf(key: DateKey): Weekday {
  const date = toUTC(key)
  if (!date) throw new Error(`Invalid date key: ${key}`)
  return (((date.getUTCDay() + 6) % 7) + 1) as Weekday
}

/** Monday of the week containing `key`, or the configured first day. */
export function startOfWeek(key: DateKey, weekStartsOn: Weekday = 1): DateKey {
  const offset = (weekdayOf(key) - weekStartsOn + 7) % 7
  return addDays(key, -offset)
}

export function endOfWeek(key: DateKey, weekStartsOn: Weekday = 1): DateKey {
  return addDays(startOfWeek(key, weekStartsOn), 6)
}

/** `-1` for "the week before week 1", `weekCount + 1` for "the week after". */
export function weekIndexFor(term: Term, date: DateKey): number {
  return Math.floor(daysBetween(term.startDate, date) / 7) + 1
}

export function weekStartDate(term: Term, weekIndex: number): DateKey {
  return addDays(term.startDate, (weekIndex - 1) * 7)
}

/** The seven dates of a teaching week, Monday first. */
export function weekDates(term: Term, weekIndex: number): DateKey[] {
  const monday = weekStartDate(term, weekIndex)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function clampWeekIndex(term: Term, weekIndex: number): number {
  return Math.min(term.weekCount, Math.max(1, weekIndex))
}

export function isWithinTerm(term: Term, weekIndex: number): boolean {
  return weekIndex >= 1 && weekIndex <= term.weekCount
}

export function isSameDay(a: DateKey, b: DateKey): boolean {
  return a === b
}

/** Lexicographic comparison is chronological for `YYYY-MM-DD`. */
export function compareDateKeys(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Month and day only, for dense headers: `"5 Nov"`. */
export function formatDayMonth(key: DateKey): string {
  const date = toUTC(key)
  if (!date) return key
  const month = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][date.getUTCMonth()]
  return `${date.getUTCDate()} ${month}`
}

/** `"Thursday 5 November"`, for the mobile day agenda header. */
export function formatLongDate(key: DateKey): string {
  const date = toUTC(key)
  if (!date) return key
  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ]
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${dayNames[date.getUTCDay()]} ${date.getUTCDate()} ${monthNames[date.getUTCMonth()]}`
}
