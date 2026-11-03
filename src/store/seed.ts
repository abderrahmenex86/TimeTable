import { addDays, nowMinute, startOfWeek, todayKey } from '@/domain/dates'
import {
  DEFAULT_DAY_WINDOW,
  buildSchedules,
  earliestFit,
} from '@/domain/free-time'
import { expandRange } from '@/domain/recurrence'
import type { Subject, Task, TaskBlock, Term, TimetableEntry, Weekday } from '@/domain/types'
import { weekdayOf } from '@/domain/dates'
import { DEFAULT_SETTINGS } from './model'
import type { TimetableData } from './model'

/**
 * Demo term.
 *
 * Dates are computed relative to *today* rather than hardcoded, so the app
 * always opens onto a plausible week — a portfolio piece that says "week 9 of
 * 12" three years after it was written is worse than no demo at all.
 *
 * The two pre-scheduled task blocks are found with the real scheduler instead
 * of hardcoded times, which means the seed can never place a study session on
 * top of a lecture.
 */

const SUBJECTS: Subject[] = [
  { id: 'sub-math', name: 'Linear Algebra', color: 'sky' },
  { id: 'sub-phys', name: 'Physics', color: 'lilac' },
  { id: 'sub-sys', name: 'Systems Programming', color: 'sage' },
  { id: 'sub-design', name: 'Design Studio', color: 'butter' },
  { id: 'sub-spanish', name: 'Spanish', color: 'rose' },
  { id: 'sub-personal', name: 'Personal', color: 'mint' },
]

const WEEKLY_ENTRIES: TimetableEntry[] = [
  {
    id: 'ent-linalg',
    subjectId: 'sub-math',
    title: 'Linear Algebra',
    location: 'Room B3',
    recurrence: { kind: 'weekly', days: [1, 3], start: 540, end: 630, parity: 'all' },
  },
  {
    id: 'ent-phys',
    subjectId: 'sub-phys',
    title: 'Physics',
    location: 'Hall 2',
    recurrence: { kind: 'weekly', days: [2, 4], start: 660, end: 750, parity: 'all' },
  },
  {
    id: 'ent-sys',
    subjectId: 'sub-sys',
    title: 'Systems Programming',
    location: 'Lab C',
    recurrence: { kind: 'weekly', days: [1], start: 840, end: 960, parity: 'all' },
  },
  {
    id: 'ent-sys-tut',
    subjectId: 'sub-sys',
    title: 'Systems tutorial',
    location: 'Lab C',
    recurrence: { kind: 'weekly', days: [4], start: 840, end: 930, parity: 'all' },
  },
  {
    id: 'ent-design',
    subjectId: 'sub-design',
    title: 'Design Studio',
    location: 'Studio 1',
    recurrence: { kind: 'weekly', days: [3], start: 780, end: 1020, parity: 'all' },
  },
  {
    id: 'ent-spanish',
    subjectId: 'sub-spanish',
    title: 'Spanish',
    recurrence: { kind: 'weekly', days: [2, 5], start: 600, end: 660, parity: 'all' },
  },
  {
    id: 'ent-climb',
    subjectId: 'sub-personal',
    title: 'Climbing',
    location: 'The Wall',
    recurrence: { kind: 'weekly', days: [5], start: 1080, end: 1170, parity: 'all' },
  },
]

/**
 * The weekly rules plus one dated session, which demonstrates that a session
 * can exist without repeating. It lands on the coming Saturday, where the week
 * is otherwise empty.
 */
function createEntries(today: string): TimetableEntry[] {
  return [
    ...WEEKLY_ENTRIES,
    {
      id: 'ent-openday',
      subjectId: 'sub-personal',
      title: 'Open day',
      location: 'Main hall',
      recurrence: {
        kind: 'dated',
        dates: [nextWeekday(today, 6)],
        start: 600,
        end: 780,
      },
    },
  ]
}

function createTasks(today: string): Task[] {
  const createdAt = new Date().toISOString()
  const due = (days: number, at = 23 * 60 + 59) => ({
    date: addDays(today, days),
    at,
  })

  return [
    {
      id: 'task-crit',
      subjectId: 'sub-design',
      title: 'Studio crit prep',
      status: 'open',
      priority: 'med',
      estimateMinutes: 120,
      deadline: due(1, 17 * 60),
      createdAt,
    },
    {
      id: 'task-read',
      subjectId: 'sub-sys',
      title: 'Read chapter 6',
      status: 'open',
      priority: 'med',
      estimateMinutes: 90,
      deadline: due(2),
      createdAt,
    },
    {
      id: 'task-pset',
      subjectId: 'sub-math',
      title: 'Problem set 4',
      status: 'open',
      priority: 'high',
      estimateMinutes: 180,
      deadline: due(3),
      createdAt,
    },
    {
      id: 'task-lab',
      subjectId: 'sub-phys',
      title: 'Lab report draft',
      status: 'open',
      priority: 'high',
      estimateMinutes: 240,
      deadline: due(4),
      createdAt,
    },
    {
      id: 'task-dentist',
      subjectId: 'sub-personal',
      title: 'Book dentist',
      status: 'open',
      priority: 'low',
      estimateMinutes: 15,
      deadline: due(6, 17 * 60),
      createdAt,
    },
    {
      id: 'task-vocab',
      subjectId: 'sub-spanish',
      title: 'Vocab review',
      status: 'open',
      priority: 'low',
      estimateMinutes: 45,
      createdAt,
    },
    {
      id: 'task-essay',
      subjectId: 'sub-spanish',
      title: 'Spanish essay',
      status: 'done',
      priority: 'med',
      estimateMinutes: 90,
      completedAt: createdAt,
      createdAt,
    },
  ]
}

export function createSeedData(
  today: string = todayKey(),
  weekStartsOn: Weekday = DEFAULT_SETTINGS.weekStartsOn,
): TimetableData {
  const term: Term = {
    id: 'term-current',
    name: 'Fall term',
    // Open the term eight weeks in, so the demo lands mid-semester.
    startDate: addDays(startOfWeek(today, weekStartsOn), -8 * 7),
    weekCount: 12,
  }

  const tasks = createTasks(today)
  const entries = createEntries(today)

  // Cancel this week's Thursday physics, which exercises the exception path.
  const exceptions = [
    { entryId: 'ent-phys', date: nextWeekday(today, 4), kind: 'cancelled' as const },
  ]

  const blocks = scheduleDemoBlocks(term, entries, exceptions, today)

  return {
    term,
    subjects: SUBJECTS,
    entries,
    exceptions,
    tasks,
    blocks,
    settings: { ...DEFAULT_SETTINGS, weekStartsOn },
  }
}

/**
 * Places one session for two tasks using the same scheduler the UI uses, so the
 * seeded week is guaranteed conflict-free.
 */
function scheduleDemoBlocks(
  term: Term,
  entries: TimetableEntry[],
  exceptions: TimetableData['exceptions'],
  today: string,
): TaskBlock[] {
  const horizon = addDays(today, 14)
  const occurrences = expandRange(term, entries, exceptions, today, horizon)
  const blocks: TaskBlock[] = []

  const wanted: Array<{ taskId: string; minutes: number }> = [
    { taskId: 'task-crit', minutes: 60 },
    { taskId: 'task-pset', minutes: 90 },
  ]

  // Start on a quarter hour rather than at whatever minute it happens to be.
  const now = Math.ceil(nowMinute() / 15) * 15

  for (const [index, want] of wanted.entries()) {
    const schedules = buildSchedules(
      today,
      horizon,
      occurrences,
      blocks,
      DEFAULT_DAY_WINDOW,
    )
    const slot = earliestFit(want.minutes, schedules, {
      date: today,
      minute: now,
    })
    if (!slot) continue

    blocks.push({
      id: `block-seed-${index}`,
      taskId: want.taskId,
      date: slot.date,
      start: slot.start,
      end: slot.end,
    })
  }

  return blocks
}

/** The date of the next occurrence of `weekday` (1 = Monday), today included. */
function nextWeekday(from: string, weekday: number): string {
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(from, offset)
    if (weekdayOf(date) === weekday) return date
  }
  return from
}
