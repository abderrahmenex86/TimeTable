import { useCallback } from 'react'
import { addDays, nowMinute, todayKey } from '@/domain/dates'
import { buildSchedules, earliestFit, type Slot } from '@/domain/free-time'
import { expandRange } from '@/domain/recurrence'
import { normalizeEstimate, remainingMinutes } from '@/domain/tasks'
import type { Task, TaskBlock } from '@/domain/types'
import { createId } from '@/lib/id'
import { useDayWindow } from './hooks'
import { useTimetable } from './timetable-store'

/**
 * Turning "I have work to do" into "it is on the calendar".
 *
 * This is the same search the drag preview uses, but reachable without a
 * pointer — which is what makes the app usable on a phone and from a keyboard.
 */

const MIN_BLOCK_MINUTES = 15
const SEARCH_HORIZON_DAYS = 14

/**
 * How long a session should be if nothing is in the way: all of the work that
 * is still unplaced, snapped up to a quarter hour. The drop handler shortens it
 * to fit the gap you actually drop into.
 */
export function desiredBlockMinutes(task: Task, blocks: TaskBlock[]): number {
  const remaining = remainingMinutes(task, blocks)
  const basis = remaining > 0 ? remaining : normalizeEstimate(task.estimateMinutes)
  const snapped = Math.ceil(basis / 15) * 15
  return Math.max(MIN_BLOCK_MINUTES, snapped)
}

export function useScheduling() {
  const term = useTimetable((state) => state.term)
  const entries = useTimetable((state) => state.entries)
  const exceptions = useTimetable((state) => state.exceptions)
  const blocks = useTimetable((state) => state.blocks)
  const addBlock = useTimetable((state) => state.addBlock)
  const window = useDayWindow()

  const placeInNextSlot = useCallback(
    (task: Task): Slot | null => {
      const today = todayKey()
      const horizon = addDays(today, SEARCH_HORIZON_DAYS)
      const deadline = task.deadline?.date
      // Never look past the deadline, and never look backwards.
      const end = deadline && deadline < horizon && deadline >= today ? deadline : horizon

      const occurrences = expandRange(term, entries, exceptions, today, end)
      const schedules = buildSchedules(today, end, occurrences, blocks, window)

      // Take the largest chunk that fits somewhere, stepping down so a 4-hour
      // task still gets placed when only 45 minutes are free.
      let duration = desiredBlockMinutes(task, blocks)

      while (duration >= MIN_BLOCK_MINUTES) {
        const slot = earliestFit(duration, schedules, {
          date: today,
          minute: nowMinute(),
        })
        if (slot) {
          addBlock({
            id: createId('block'),
            taskId: task.id,
            date: slot.date,
            start: slot.start,
            end: slot.end,
          })
          return slot
        }
        duration -= 15
      }

      return null
    },
    [term, entries, exceptions, blocks, addBlock, window],
  )

  return { placeInNextSlot }
}
