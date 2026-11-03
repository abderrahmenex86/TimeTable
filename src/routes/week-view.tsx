import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { TopBar } from '@/components/shell/top-bar'
import { TaskForm } from '@/components/task-panel/task-form'
import { TaskPanel } from '@/components/task-panel/task-panel'
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer'
import { EntryForm } from '@/components/week-grid/entry-form'
import { minuteForOffset } from '@/components/week-grid/metrics'
import { WeekGrid, type DropPreview } from '@/components/week-grid/week-grid'
import { DayAgenda } from '@/components/day-agenda/day-agenda'
import { formatDayMonth } from '@/domain/dates'
import { describeConflict, findConflict } from '@/domain/conflicts'
import { DEFAULT_DAY_WINDOW } from '@/domain/free-time'
import { formatClock, snapMinute } from '@/domain/time'
import type { DateKey, Task, TimetableEntry } from '@/domain/types'
import { createId } from '@/lib/id'
import { useOccurrences, useWeek } from '@/store/hooks'
import { suggestedBlockMinutes } from '@/store/scheduling'
import { useTimetable } from '@/store/timetable-store'
import { useUndoable } from '@/store/undo'

const WINDOW = DEFAULT_DAY_WINDOW
const SNAP_MINUTES = 15

type TargetArgs = {
  overRectTop: number | null
  date: string | undefined
  clientY: number | null
  deltaY: number
  minutes: number
}

/**
 * Pointer position → a slot on the grid.
 *
 * The column's top edge is the window start, so a vertical offset converts
 * straight to minutes; the block keeps its full length and slides up rather
 * than being clipped at the bottom of the day.
 */
function targetFor({
  overRectTop,
  date,
  clientY,
  deltaY,
  minutes,
}: TargetArgs): DropPreview | null {
  if (overRectTop === null || clientY === null || !date) return null

  const offsetY = clientY + deltaY - overRectTop
  const duration = Math.min(minutes, WINDOW.end - WINDOW.start)
  const raw = snapMinute(minuteForOffset(offsetY, WINDOW), SNAP_MINUTES)
  const start = Math.max(WINDOW.start, Math.min(raw, WINDOW.end - duration))

  return { date, start, end: start + duration }
}

export function WeekView() {
  const { term, weekIndex, dates } = useWeek()
  const subjects = useTimetable((state) => state.subjects)
  const entries = useTimetable((state) => state.entries)
  const tasks = useTimetable((state) => state.tasks)
  const blocks = useTimetable((state) => state.blocks)
  const addBlock = useTimetable((state) => state.addBlock)
  const deleteBlock = useTimetable((state) => state.deleteBlock)
  const tasksLocked = useTimetable((state) => state.settings.tasksLocked)

  const run = useUndoable()
  const weekOccurrences = useOccurrences(dates[0], dates[6])

  const [taskOpen, setTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [entryOpen, setEntryOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [preview, setPreview] = useState<DropPreview | null>(null)
  const [tasksOpen, setTasksOpen] = useState(false)

  // Mouse only. On touch, dragging a card would fight with scrolling the panel,
  // and the "find the next free slot" button covers the same job better.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
  )

  const openNewTask = () => {
    setEditingTask(null)
    setTaskOpen(true)
  }

  const openTask = (task: Task) => {
    setEditingTask(task)
    setTaskOpen(true)
  }

  const openNewEntry = () => {
    setEditingEntry(null)
    setEntryOpen(true)
  }

  const openEntry = (entryId: string) => {
    setEditingEntry(entries.find((entry) => entry.id === entryId) ?? null)
    setEntryOpen(true)
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((candidate) => candidate.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function handleDragMove(event: DragMoveEvent) {
    const task = tasks.find((candidate) => candidate.id === event.active.id)
    if (!task) return

    setPreview(
      targetFor({
        overRectTop: event.over?.rect.top ?? null,
        date: (event.over?.data.current as { date?: DateKey } | undefined)?.date,
        clientY: (event.activatorEvent as PointerEvent).clientY ?? null,
        deltaY: event.delta.y,
        minutes: suggestedBlockMinutes(task, blocks),
      }),
    )
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    setPreview(null)

    if (tasksLocked) {
      toast.error('The calendar is locked', {
        description: 'Unlock it in the toolbar to schedule tasks.',
      })
      return
    }

    const task = tasks.find((candidate) => candidate.id === event.active.id)
    if (!task) return

    const target = targetFor({
      overRectTop: event.over?.rect.top ?? null,
      date: (event.over?.data.current as { date?: DateKey } | undefined)?.date,
      clientY: (event.activatorEvent as PointerEvent).clientY ?? null,
      deltaY: event.delta.y,
      minutes: suggestedBlockMinutes(task, blocks),
    })
    if (!target) return

    const conflict = findConflict(
      target.date,
      target,
      weekOccurrences,
      blocks,
      tasks,
    )
    if (conflict) {
      toast.error(describeConflict(conflict))
      return
    }

    addBlock({
      id: createId('block'),
      taskId: task.id,
      date: target.date,
      start: target.start,
      end: target.end,
    })

    toast.success(`Placed ${task.title}`, {
      description: `${formatDayMonth(target.date)} · ${formatClock(target.start)}–${formatClock(target.end)}`,
    })
  }

  return (
    <div className="app-shell h-dvh overflow-hidden bg-paper p-3 sm:p-4">
      <div className="mx-auto flex h-full max-w-[1900px] flex-col gap-3">
        <TopBar
          onNewTask={openNewTask}
          onNewSession={openNewEntry}
          onOpenTasks={() => setTasksOpen(true)}
        />

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveTask(null)
            setPreview(null)
          }}
        >
          <div className="flex min-h-0 flex-1 gap-3">
            <section className="print-flat flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-rule bg-paper-raised">
              <div className="hidden border-b border-rule px-3 pt-2 pb-1 print:block">
                <p className="font-hand text-[1.1rem] leading-none">
                  {term.name} · Week {weekIndex} of {term.weekCount}
                </p>
              </div>
              <div className="hidden min-h-0 flex-1 md:flex">
                <WeekGrid
                  onSelectEntry={openEntry}
                  onRemoveBlock={(blockId) =>
                    run('Session removed', () => deleteBlock(blockId))
                  }
                  preview={preview}
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col md:hidden">
                <DayAgenda onSelectEntry={openEntry} />
              </div>
            </section>

            <aside className="no-print hidden w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-rule bg-paper-raised lg:flex">
              <TaskPanel onCreate={openNewTask} onEdit={openTask} />
            </aside>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div
                className="sketch-sm ink-shadow-sm max-w-[240px] bg-paper-raised px-2.5 py-1.5 font-hand text-[0.9rem] leading-tight text-ink"
                style={{ transform: 'rotate(-1.2deg)' }}
              >
                {activeTask.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Mounted only while open, so the fields initialise from the record
          being edited without an effect to reset them. */}
      {taskOpen ? (
        <TaskForm
          open
          onOpenChange={setTaskOpen}
          task={editingTask}
          subjects={subjects}
        />
      ) : null}

      {entryOpen ? (
        <EntryForm
          open
          onOpenChange={setEntryOpen}
          entry={editingEntry}
          subjects={subjects}
        />
      ) : null}

      <Drawer open={tasksOpen} onOpenChange={setTasksOpen}>
        <DrawerContent className="h-[85dvh]">
          <DrawerTitle className="sr-only">Tasks</DrawerTitle>
          <div className="min-h-0 flex-1 overflow-hidden">
            <TaskPanel onCreate={openNewTask} onEdit={openTask} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
