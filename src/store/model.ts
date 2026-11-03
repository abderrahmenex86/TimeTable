import type {
  EntryException,
  Subject,
  Task,
  TaskBlock,
  Term,
  TimetableEntry,
  Weekday,
} from '@/domain/types'
import { startOfWeek } from '@/domain/dates'

export type ThemeMode = 'light' | 'dark'

export type Settings = {
  theme: ThemeMode
  /** 1 = Monday … 7 = Sunday. */
  weekStartsOn: Weekday
  /** When locked, tasks cannot be dragged onto the calendar. */
  tasksLocked: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  weekStartsOn: 1,
  tasksLocked: false,
}

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
  settings: Settings
}

export const SCHEMA_VERSION = 1

/** A blank slate that still knows which week it is. */
export function createEmptyData(
  today: string,
  weekStartsOn: Weekday = 1,
): TimetableData {
  return {
    term: {
      id: 'term-current',
      name: 'Term',
      startDate: startOfWeek(today, weekStartsOn),
      weekCount: 12,
    },
    subjects: [],
    entries: [],
    exceptions: [],
    tasks: [],
    blocks: [],
    settings: { ...DEFAULT_SETTINGS, weekStartsOn },
  }
}
