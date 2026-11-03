import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
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
import { WeekGrid } from '@/components/week-grid/week-grid'
import type { Task, TimetableEntry } from '@/domain/types'
import { useWeek } from '@/store/hooks'
import { useTimetable } from '@/store/timetable-store'

export function WeekView() {
  const { term, weekIndex } = useWeek()
  const setWeekIndex = useTimetable((state) => state.setWeekIndex)
  const goToToday = useTimetable((state) => state.goToToday)
  const showFreeTime = useTimetable((state) => state.showFreeTime)
  const toggleFreeTime = useTimetable((state) => state.toggleFreeTime)
  const subjects = useTimetable((state) => state.subjects)
  const entries = useTimetable((state) => state.entries)

  const [taskOpen, setTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [entryOpen, setEntryOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null)

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

      <div className="flex min-h-0 flex-1">
        <WeekGrid onSelectEntry={openEntry} />

        <aside className="hidden w-[320px] shrink-0 border-l border-rule bg-paper-sunk/40 lg:block">
          <TaskPanel onCreate={openNewTask} onEdit={openTask} />
        </aside>
      </div>

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
