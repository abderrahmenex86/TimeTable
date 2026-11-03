import { compareDateKeys } from './dates'
import type { DateKey, Priority, Task, TaskBlock } from './types'

/**
 * Tasks are measured in effort, not in start times.
 *
 * A task knows two things: when it must be finished, and how much work it is.
 * How much of that work you have already committed to the calendar is derived
 * from its blocks — there is no stored percentage to drift out of sync.
 */

export type Moment = { date: DateKey; minute: number }

const PRIORITY_RANK: Record<Priority, number> = { high: 0, med: 1, low: 2 }

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High',
  med: 'Medium',
  low: 'Low',
}

export const DEFAULT_ESTIMATE_MINUTES = 60

export function compareMoments(a: Moment, b: Moment): number {
  if (a.date !== b.date) return compareDateKeys(a.date, b.date)
  return a.minute - b.minute
}

export function deadlineMoment(task: Task): Moment | null {
  return task.deadline ? { date: task.deadline.date, minute: task.deadline.at } : null
}

export function blocksForTask(taskId: string, blocks: TaskBlock[]): TaskBlock[] {
  return blocks.filter((block) => block.taskId === taskId)
}

export function scheduledMinutes(taskId: string, blocks: TaskBlock[]): number {
  return blocksForTask(taskId, blocks).reduce(
    (total, block) => total + Math.max(0, block.end - block.start),
    0,
  )
}

/** Work left to place on the calendar. Negative when over-scheduled. */
export function remainingMinutes(task: Task, blocks: TaskBlock[]): number {
  return normalizeEstimate(task.estimateMinutes) - scheduledMinutes(task.id, blocks)
}

export function isFullyScheduled(task: Task, blocks: TaskBlock[]): boolean {
  return remainingMinutes(task, blocks) <= 0
}

export function taskProgress(task: Task, blocks: TaskBlock[]) {
  const estimate = normalizeEstimate(task.estimateMinutes)
  const scheduled = scheduledMinutes(task.id, blocks)
  return {
    estimate,
    scheduled,
    remaining: Math.max(0, estimate - scheduled),
    /** 0–1, clamped, for the segmented bar. */
    ratio: estimate === 0 ? 0 : Math.min(1, scheduled / estimate),
    overscheduled: scheduled > estimate,
  }
}

export function normalizeEstimate(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return DEFAULT_ESTIMATE_MINUTES
  return Math.round(minutes)
}

export function isOverdue(task: Task, now: Moment): boolean {
  if (task.status === 'done') return false
  const deadline = deadlineMoment(task)
  return deadline !== null && compareMoments(deadline, now) < 0
}

export function isDueOn(task: Task, date: DateKey): boolean {
  return task.deadline?.date === date
}

/** Deadline ordable; tasks without one sort last. */
export function compareTasks(a: Task, b: Task): number {
  const aDeadline = deadlineMoment(a)
  const bDeadline = deadlineMoment(b)

  if (aDeadline && bDeadline) {
    const byDeadline = compareMoments(aDeadline, bDeadline)
    if (byDeadline !== 0) return byDeadline
  } else if (aDeadline) {
    return -1
  } else if (bDeadline) {
    return 1
  }

  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  if (byPriority !== 0) return byPriority

  return a.title.localeCompare(b.title)
}

export type TaskGroupId = 'overdue' | 'today' | 'week' | 'later' | 'someday' | 'done'

export type TaskGroup = {
  id: TaskGroupId
  label: string
  tasks: Task[]
}

/**
 * The task panel's reading order: what is late, what is today, what is due this
 * week, what is further out, what has no date at all, and finally what is done.
 */
export function groupTasks(
  tasks: Task[],
  now: Moment,
  weekEnd: DateKey,
): TaskGroup[] {
  const buckets: Record<TaskGroupId, Task[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    someday: [],
    done: [],
  }

  for (const task of tasks) {
    if (task.status === 'done') {
      buckets.done.push(task)
      continue
    }

    const deadline = deadlineMoment(task)
    if (!deadline) {
      buckets.someday.push(task)
    } else if (compareMoments(deadline, now) < 0) {
      buckets.overdue.push(task)
    } else if (deadline.date === now.date) {
      buckets.today.push(task)
    } else if (deadline.date <= weekEnd) {
      buckets.week.push(task)
    } else {
      buckets.later.push(task)
    }
  }

  const order: TaskGroupId[] = ['overdue', 'today', 'week', 'later', 'someday', 'done']
  const labels: Record<TaskGroupId, string> = {
    overdue: 'Overdue',
    today: 'Today',
    week: 'This week',
    later: 'Later',
    someday: 'No date',
    done: 'Done',
  }

  return order
    .map((id) => {
      const sorted = [...buckets[id]]
      if (id === 'done') {
        sorted.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      } else {
        sorted.sort(compareTasks)
      }
      return { id, label: labels[id], tasks: sorted }
    })
    .filter((group) => group.tasks.length > 0)
}

export function countOpen(tasks: Task[]): number {
  return tasks.filter((task) => task.status === 'open').length
}
