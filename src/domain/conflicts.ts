import { overlaps } from './intervals'
import type { DateKey, Interval, Occurrence, Task, TaskBlock } from './types'

/**
 * Conflict detection.
 *
 * The app refuses to double-book rather than silently stacking blocks. A drop
 * that would land on a lecture is rejected with the reason named, which teaches
 * the constraint instead of hiding it.
 */

export type Conflict =
  | { kind: 'entry'; title: string; occurrence: Occurrence }
  | { kind: 'task'; title: string; block: TaskBlock }

export function findConflict(
  date: DateKey,
  interval: Interval,
  occurrences: Occurrence[],
  blocks: TaskBlock[],
  tasks: Task[],
  /** Ignore a block that is being moved, so it does not collide with itself. */
  ignoreBlockId?: string,
): Conflict | null {
  for (const occurrence of occurrences) {
    if (occurrence.date === date && overlaps(interval, occurrence)) {
      return { kind: 'entry', title: occurrence.title, occurrence }
    }
  }

  for (const block of blocks) {
    if (block.id === ignoreBlockId) continue
    if (block.date !== date || !overlaps(interval, block)) continue
    const task = tasks.find((candidate) => candidate.id === block.taskId)
    return { kind: 'task', title: task?.title ?? 'another session', block }
  }

  return null
}

export function describeConflict(conflict: Conflict): string {
  return conflict.kind === 'entry'
    ? `That overlaps ${conflict.title}`
    : `That overlaps your ${conflict.title} session`
}
