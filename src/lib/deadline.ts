import { daysBetween, formatDayMonth, weekdayOf } from '@/domain/dates'
import type { Moment } from '@/domain/tasks'
import { compareMoments } from '@/domain/tasks'
import { formatClock, type TimeFormat } from '@/domain/time'
import { WEEKDAY_LABELS, type Task } from '@/domain/types'

export type DeadlineTone = 'overdue' | 'today' | 'soon' | 'later'

export type DeadlineDescription = { label: string; tone: DeadlineTone }

/** Any deadline at or after 23:00 means "by the end of that day". */
const END_OF_DAY = 23 * 60

function pluralDays(count: number): string {
  return count === 1 ? '1 day' : `${count} days`
}

/** Suppress the clock time when it carries no information. */
function withTime(at: number, format: TimeFormat): string {
  return at >= END_OF_DAY ? '' : ` · ${formatClock(at, format)}`
}

/**
 * Deadlines live in the task panel, where horizontal space is scarce and the
 * reading question is always "how soon", not "what date". So: relative for the
 * next week, absolute beyond it.
 */
export function describeDeadline(
  task: Task,
  now: Moment,
  format: TimeFormat = '24h',
): DeadlineDescription | null {
  if (!task.deadline) return null

  const { date, at } = task.deadline
  const moment = { date, minute: at }
  const offset = daysBetween(now.date, date)

  if (compareMoments(moment, now) < 0) {
    if (offset === 0) return { label: `Overdue${withTime(at, format)}`, tone: 'overdue' }
    return { label: `${pluralDays(Math.abs(offset))} overdue`, tone: 'overdue' }
  }

  if (offset === 0) return { label: `Today${withTime(at, format)}`, tone: 'today' }
  if (offset === 1) return { label: `Tomorrow${withTime(at, format)}`, tone: 'soon' }
  if (offset <= 6) {
    return {
      label: `${WEEKDAY_LABELS[weekdayOf(date)]}${withTime(at, format)}`,
      tone: 'soon',
    }
  }

  return { label: formatDayMonth(date), tone: 'later' }
}

export const DEADLINE_TONE_CLASS: Record<DeadlineTone, string> = {
  overdue: 'text-rose-pen',
  today: 'text-ink',
  soon: 'text-ink-60',
  later: 'text-ink-40',
}
