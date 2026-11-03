/**
 * Domain types.
 *
 * Two conventions run through this whole folder and everything downstream:
 *
 * 1. Times are integer minutes from local midnight. `540` is 09:00. They are
 *    never Date objects, so a recurring class does not shift when the clocks
 *    change.
 * 2. Dates are `YYYY-MM-DD` strings in the user's local calendar. They are
 *    never round-tripped through `new Date('...')`, because that parses as UTC
 *    midnight and lands on the previous day in any negative-offset timezone.
 */

/** Minutes from local midnight, 0–1440. */
export type Minute = number

/** 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** A local calendar date, `YYYY-MM-DD`. */
export type DateKey = string

/** Half-open range: `start` is included, `end` is not. */
export type Interval = { start: Minute; end: Minute }

export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
}

/**
 * Subject colours are stored as a token name, not as a hex value. The pastel
 * fill and its paired "pen" tone both live in CSS, which means the palette can
 * be retuned without migrating anyone's saved data.
 */
export type SubjectColor = 'rose' | 'sage' | 'sky' | 'butter' | 'lilac' | 'mint'

export const SUBJECT_COLORS: readonly SubjectColor[] = [
  'rose',
  'sage',
  'sky',
  'butter',
  'lilac',
  'mint',
]

export type Subject = {
  id: string
  name: string
  color: SubjectColor
}

export type Term = {
  id: string
  name: string
  /** Local date of the Monday that begins week 1. */
  startDate: DateKey
  /** Number of teaching weeks. Week indexes are 1-based. */
  weekCount: number
}

/** 1-based, inclusive. */
export type WeekRange = { from: number; to: number }

export type WeekParity = 'all' | 'odd' | 'even'

/** Every variant shares the time of day. */
type RecurrenceTime = { start: Minute; end: Minute }

/**
 * A repeating commitment, or a single dated session.
 *
 * Deliberately not RFC 5545 — this covers what a timetable actually needs. The
 * union matters: a one-off has a date and no days, so `days` and `parity` are
 * only reachable after narrowing to `weekly`.
 */
export type Recurrence =
  | (RecurrenceTime & {
      kind: 'weekly'
      days: Weekday[]
      parity: WeekParity
      /** Omit for "every week of the term". */
      weeks?: WeekRange
    })
  | (RecurrenceTime & {
      kind: 'once'
      date: DateKey
    })

/** The stored rule. Never rendered directly — project it into a week first. */
export type TimetableEntry = {
  id: string
  subjectId: string
  title: string
  location?: string
  recurrence: Recurrence
}

/** A rule projected onto one concrete date. Computed, never persisted. */
export type Occurrence = {
  entryId: string
  subjectId: string
  title: string
  location?: string
  date: DateKey
  start: Minute
  end: Minute
}

/** A single session cancelled without disturbing the rest of the series. */
export type EntryException = {
  entryId: string
  date: DateKey
  kind: 'cancelled'
}

export type TaskStatus = 'open' | 'done'

export type Priority = 'low' | 'med' | 'high'

export type Task = {
  id: string
  subjectId?: string
  title: string
  notes?: string
  status: TaskStatus
  priority: Priority
  /**
   * How much work this is, in minutes. Independent of when — the deadline says
   * when it must be finished, this says how much of your time it eats.
   */
  estimateMinutes: number
  deadline?: { date: DateKey; at: Minute }
  createdAt: string
  completedAt?: string
}

/** Time committed to a task on a specific day. A task may have many. */
export type TaskBlock = {
  id: string
  taskId: string
  date: DateKey
} & Interval

/** Everything occupying one day of the grid, ready to render. */
export type CalendarItem =
  | { kind: 'entry'; occurrence: Occurrence }
  | { kind: 'task'; block: TaskBlock; task: Task }
