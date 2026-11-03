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
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { TaskForm } from '@/components/task-panel/task-form'
import { TaskPanel } from '@/components/task-panel/task-panel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EntryForm } from '@/components/week-grid/entry-form'
import {
  minuteForOffset,
} from '@/components/week-grid/metrics'
import { WeekGrid, type DropPreview } from '@/components/week-grid/week-grid'
import { formatDayMonth } from '@/domain/dates'
import { describeConflict, findConflict } from '@/domain/conflicts'
import { DEFAULT_DAY_WINDOW } from '@/domain/free-time'
import { formatClock, snapMinute } from '@/domain/time'
import type { DateKey, Task, TimetableEntry } from '@/domain/types'
import { createId } from '@/lib/id'
import { useOccurrences, useWeek } from '@/store/hooks'
import { suggestedBlockMinutes } from '@/store/scheduling'
import { useTimetable } from '@/store/timetable-store'

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
  const start = Math.max(
    WINDOW.start,
    Math.min(raw, WINDOW.end - duration),
  )

  return { date, start, end: start + duration }
}

export function WeekView() {
  const { term, weekIndex, dates } = useWeek()
  const setWeekIndex = useTimetable((state) => state.setWeekIndex)
  const goToToday = useTimetable((state) => state.goToToday)
  const showFreeTime = useTimetable((state) => state.showFreeTime)
  const toggleFreeTime = useTimetable((state) => state.toggleFreeTime)
  const subjects = useTimetable((state) => state.subjects)
  const entries = useTimetable((state) => state.entries)
  const tasks = useTimetable((state) => state.tasks)
  const blocks = useTimetable((state) => state.blocks)
  const addBlock = useTimetable((state) => state.addBlock)

  const weekOccurrences = useOccurrences(dates[0], dates[6])

  const [taskOpen, setTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [entryOpen, setEntryOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null)

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [preview, setPreview] = useState<DropPreview | null>(null)

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

  const atStart = weekIndex <= 1
  const atEnd = weekIndex >= term.weekCount

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-rule px-5 pt-6 pb-3 sm:px-8">
        <div>
          <h1 className="font-hand text-[1.6rem] leading-none">{term.name}</h1>
          <p className="mt-1.5 text-[0.78rem] text-ink-60" data-num>
            Week {weekIndex} of {term.weekCount}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous week"
              disabled={atStart}
              onClick={() => setWeekIndex(weekIndex - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="font-hand"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next week"
              disabled={atEnd}
              onClick={() => setWeekIndex(weekIndex + 1)}
            >
              <ChevronRight />
            </Button>
          </div>

          <Button
            variant={showFreeTime ? 'default' : 'outline'}
            size="sm"
            className="font-hand"
            aria-pressed={showFreeTime}
            onClick={toggleFreeTime}
          >
            Free time
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="font-hand">
                <Plus data-icon="inline-start" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={openNewTask}>New task</DropdownMenuItem>
              <DropdownMenuItem onSelect={openNewEntry}>
                New session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

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
        <div className="flex min-h-0 flex-1">
          <WeekGrid onSelectEntry={openEntry} preview={preview} />

          <aside className="hidden w-[320px] shrink-0 border-l border-rule bg-paper-sunk/40 lg:block">
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

      <TaskForm
        open={taskOpen}
        onOpenChange={setTaskOpen}
        task={editingTask}
        subjects={subjects}
      />

      <EntryForm
        open={entryOpen}
        onOpenChange={setEntryOpen}
        entry={editingEntry}
        subjects={subjects}
      />
    </div>
  )
}
