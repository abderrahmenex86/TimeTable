import type {
  EntryException,
  Subject,
  Task,
  TaskBlock,
  Term,
  TimetableEntry,
} from '@/domain/types'
import { startOfWeek } from '@/domain/dates'

/**
 * The whole persisted document. One object, one IndexedDB key.
 *
 * A term of real data is tens of kilobytes, so splitting this across tables
 * would buy nothing but join logic. `version` exists so a future shape change
 * can migrate instead of wiping someone's semester.
 */
export type TimetableData = {
  term: Term
  subjects: Subject[]
  entries: TimetableEntry[]
  exceptions: EntryException[]
  tasks: Task[]
  blocks: TaskBlock[]
}

export const SCHEMA_VERSION = 1

/** A blank slate that still knows which week it is. */
export function createEmptyData(today: string): TimetableData {
  return {
    term: {
      id: 'term-current',
      name: 'Term',
      startDate: startOfWeek(today),
      weekCount: 12,
    },
    subjects: [],
    entries: [],
    exceptions: [],
    tasks: [],
    blocks: [],
  }
}
