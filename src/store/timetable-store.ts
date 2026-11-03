import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { startOfWeek, todayKey, weekIndexFor } from '@/domain/dates'
import { MINUTES_PER_DAY, type TimeFormat } from '@/domain/time'
import type {
  DateKey,
  EntryException,
  Minute,
  Subject,
  Task,
  TaskBlock,
  TimetableEntry,
  Weekday,
} from '@/domain/types'
import {
  createEmptyData,
  SCHEMA_VERSION,
  type ThemeMode,
  type TimetableData,
} from './model'
import { createIndexedDbStorage } from './persistence'
import { createSeedData } from './seed'

const UNDO_LIMIT = 20

function clampWeek(weekCount: number, index: number): number {
  return Math.min(weekCount, Math.max(1, index))
}

function pickData(state: TimetableData): TimetableData {
  return {
    term: state.term,
    subjects: state.subjects,
    entries: state.entries,
    exceptions: state.exceptions,
    tasks: state.tasks,
    blocks: state.blocks,
    settings: state.settings,
  }
}

type Actions = {
  setWeekIndex: (index: number) => void
  goToToday: () => void
  setHydrated: () => void
  toggleFreeTime: () => void

  setTheme: (theme: ThemeMode) => void
  setWeekStartsOn: (weekStartsOn: Weekday) => void
  toggleTaskLock: () => void
  setTimeFormat: (format: TimeFormat) => void
  setDayWindow: (start: Minute, end: Minute) => void

  addSubject: (subject: Subject) => void
  updateSubject: (id: string, patch: Partial<Subject>) => void
  deleteSubject: (id: string) => void

  addEntry: (entry: TimetableEntry) => void
  updateEntry: (id: string, patch: Partial<TimetableEntry>) => void
  deleteEntry: (id: string) => void
  cancelOccurrence: (entryId: string, date: DateKey) => void
  restoreOccurrence: (entryId: string, date: DateKey) => void

  addTask: (task: Task) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void

  addBlock: (block: TaskBlock) => void
  updateBlock: (id: string, patch: Partial<TaskBlock>) => void
  deleteBlock: (id: string) => void

  undo: () => void
  resetToDemo: () => void
  clearAll: () => void
}

export type TimetableState = TimetableData & {
  /** Which teaching week the grid is showing. Transient. */
  weekIndex: number
  /** Whether free gaps are highlighted on the grid. Transient. */
  showFreeTime: boolean
  /** False until IndexedDB has been read. */
  hydrated: boolean
  /** Snapshots for undo. Transient — deliberately not persisted. */
  undoStack: TimetableData[]
} & Actions

export const useTimetable = create<TimetableState>()(
  persist(
    (set) => {
      const seed = createSeedData()
      const startWeek = clampWeek(
        seed.term.weekCount,
        weekIndexFor(seed.term, todayKey()),
      )

      const pushUndo = (state: TimetableState): TimetableData[] =>
        [...state.undoStack, pickData(state)].slice(-UNDO_LIMIT)

      return {
        ...seed,
        weekIndex: startWeek,
        showFreeTime: false,
        hydrated: false,
        undoStack: [],

        setWeekIndex: (index) =>
          set((state) => ({
            weekIndex: clampWeek(state.term.weekCount, index),
          })),

        goToToday: () =>
          set((state) => ({
            weekIndex: clampWeek(
              state.term.weekCount,
              weekIndexFor(state.term, todayKey()),
            ),
          })),

        setHydrated: () => set({ hydrated: true }),

        toggleFreeTime: () =>
          set((state) => ({ showFreeTime: !state.showFreeTime })),

        setTheme: (theme) =>
          set((state) => ({ settings: { ...state.settings, theme } })),

        /**
         * Re-anchors the term so week 1 still starts on the chosen day. Without
         * this the week index maths would silently drift by a few days.
         */
        setWeekStartsOn: (weekStartsOn) =>
          set((state) => ({
            settings: { ...state.settings, weekStartsOn },
            term: {
              ...state.term,
              startDate: startOfWeek(state.term.startDate, weekStartsOn),
            },
          })),

        toggleTaskLock: () =>
          set((state) => ({
            settings: {
              ...state.settings,
              tasksLocked: !state.settings.tasksLocked,
            },
          })),

        setTimeFormat: (timeFormat) =>
          set((state) => ({ settings: { ...state.settings, timeFormat } })),

        /**
         * Guards the window so the grid can never invert or collapse: at least
         * an hour is always visible.
         */
        setDayWindow: (start, end) =>
          set((state) => {
            const dayStart = Math.min(
              Math.max(0, Math.round(start)),
              MINUTES_PER_DAY - 60,
            )
            const dayEnd = Math.min(
              Math.max(dayStart + 60, Math.round(end)),
              MINUTES_PER_DAY,
            )
            return { settings: { ...state.settings, dayStart, dayEnd } }
          }),

        addSubject: (subject) =>
          set((state) => ({ subjects: [...state.subjects, subject] })),

        updateSubject: (id, patch) =>
          set((state) => ({
            subjects: state.subjects.map((subject) =>
              subject.id === id ? { ...subject, ...patch } : subject,
            ),
          })),

        deleteSubject: (id) =>
          set((state) => {
            const entries = state.entries.filter(
              (entry) => entry.subjectId !== id,
            )
            const keptEntryIds = new Set(entries.map((entry) => entry.id))
            return {
              undoStack: pushUndo(state),
              subjects: state.subjects.filter((subject) => subject.id !== id),
              entries,
              exceptions: state.exceptions.filter((exception) =>
                keptEntryIds.has(exception.entryId),
              ),
              // Tasks outlive their subject; they just become untagged.
              tasks: state.tasks.map((task) =>
                task.subjectId === id ? { ...task, subjectId: undefined } : task,
              ),
            }
          }),

        addEntry: (entry) =>
          set((state) => ({ entries: [...state.entries, entry] })),

        updateEntry: (id, patch) =>
          set((state) => ({
            entries: state.entries.map((entry) =>
              entry.id === id ? { ...entry, ...patch } : entry,
            ),
          })),

        deleteEntry: (id) =>
          set((state) => ({
            undoStack: pushUndo(state),
            entries: state.entries.filter((entry) => entry.id !== id),
            exceptions: state.exceptions.filter(
              (exception) => exception.entryId !== id,
            ),
          })),

        cancelOccurrence: (entryId, date) =>
          set((state) => {
            const already = state.exceptions.some(
              (exception) =>
                exception.entryId === entryId && exception.date === date,
            )
            if (already) return {}
            const exception: EntryException = {
              entryId,
              date,
              kind: 'cancelled',
            }
            return {
              undoStack: pushUndo(state),
              exceptions: [...state.exceptions, exception],
            }
          }),

        restoreOccurrence: (entryId, date) =>
          set((state) => ({
            exceptions: state.exceptions.filter(
              (exception) =>
                !(exception.entryId === entryId && exception.date === date),
            ),
          })),

        addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

        updateTask: (id, patch) =>
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id ? { ...task, ...patch } : task,
            ),
          })),

        deleteTask: (id) =>
          set((state) => ({
            undoStack: pushUndo(state),
            tasks: state.tasks.filter((task) => task.id !== id),
            blocks: state.blocks.filter((block) => block.taskId !== id),
          })),

        toggleTask: (id) =>
          set((state) => {
            const task = state.tasks.find((candidate) => candidate.id === id)
            if (!task) return {}

            const completing = task.status === 'open'
            const today = todayKey()

            return {
              undoStack: pushUndo(state),
              tasks: state.tasks.map((candidate) =>
                candidate.id === id
                  ? {
                      ...candidate,
                      status: completing ? 'done' : 'open',
                      completedAt: completing
                        ? new Date().toISOString()
                        : undefined,
                    }
                  : candidate,
              ),
              // Finishing work releases its remaining sessions, so the free
              // time the app reports stays honest.
              blocks: completing
                ? state.blocks.filter(
                    (block) => !(block.taskId === id && block.date >= today),
                  )
                : state.blocks,
            }
          }),

        addBlock: (block) =>
          set((state) => ({ blocks: [...state.blocks, block] })),

        updateBlock: (id, patch) =>
          set((state) => ({
            blocks: state.blocks.map((block) =>
              block.id === id ? { ...block, ...patch } : block,
            ),
          })),

        deleteBlock: (id) =>
          set((state) => ({
            undoStack: pushUndo(state),
            blocks: state.blocks.filter((block) => block.id !== id),
          })),

        undo: () =>
          set((state) => {
            const previous = state.undoStack[state.undoStack.length - 1]
            if (!previous) return {}
            return {
              ...previous,
              undoStack: state.undoStack.slice(0, -1),
            }
          }),

        resetToDemo: () =>
          set((state) => {
            const fresh = createSeedData(
              todayKey(),
              state.settings.weekStartsOn,
            )
            return {
              ...fresh,
              weekIndex: clampWeek(
                fresh.term.weekCount,
                weekIndexFor(fresh.term, todayKey()),
              ),
              undoStack: pushUndo(state),
            }
          }),

        clearAll: () =>
          set((state) => ({
            ...createEmptyData(todayKey(), state.settings.weekStartsOn),
            // Keep the user's preferences; only the timetable is cleared.
            settings: state.settings,
            weekIndex: 1,
            undoStack: pushUndo(state),
          })),
      }
    },
    {
      name: 'timetable',
      version: SCHEMA_VERSION,
      storage: createIndexedDbStorage<TimetableData>(),
      partialize: (state) => pickData(state),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    },
  ),
)

export function canUndo(state: TimetableState): boolean {
  return state.undoStack.length > 0
}

export const useTimetableActions = () => useTimetable((state) => state)
export const useWeekIndex = () => useTimetable((state) => state.weekIndex)
export const useTerm = () => useTimetable((state) => state.term)

/** Convenience for imperative reads outside React. */
export const timetableActions = () => useTimetable.getState()
