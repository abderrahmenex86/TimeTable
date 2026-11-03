import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DateField } from '@/components/fields/date-field'
import { TimeField } from '@/components/fields/time-field'
import { normalizeEstimate } from '@/domain/tasks'
import type { DateKey, Priority, Subject, Task } from '@/domain/types'
import { createId } from '@/lib/id'
import { useTimeFormat } from '@/store/hooks'
import { useTimetable } from '@/store/timetable-store'
import { useUndoable } from '@/store/undo'

const NO_SUBJECT = 'none'

const PRIORITIES: Array<{ value: Priority; label: string }> = [
  { value: 'high', label: 'High' },
  { value: 'med', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

/** A deadline with no explicit time means "by the end of that day". */
const END_OF_DAY = 23 * 60 + 59

type FormState = {
  title: string
  subjectId: string
  priority: Priority
  estimate: string
  date: DateKey | ''
  time: number
  notes: string
}

function initialState(task: Task | null): FormState {
  return {
    title: task?.title ?? '',
    subjectId: task?.subjectId ?? NO_SUBJECT,
    priority: task?.priority ?? 'med',
    estimate: String(task?.estimateMinutes ?? 60),
    date: task?.deadline?.date ?? '',
    time: task?.deadline?.at ?? END_OF_DAY,
    notes: task?.notes ?? '',
  }
}

type TaskFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` creates a new task. */
  task: Task | null
  subjects: Subject[]
}

export function TaskForm({ open, onOpenChange, task, subjects }: TaskFormProps) {
  const addTask = useTimetable((state) => state.addTask)
  const updateTask = useTimetable((state) => state.updateTask)
  const deleteTask = useTimetable((state) => state.deleteTask)
  const timeFormat = useTimeFormat()
  const run = useUndoable()

  const [form, setForm] = useState<FormState>(() => initialState(task))
  const [showErrors, setShowErrors] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const titleMissing = form.title.trim().length === 0

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (titleMissing) {
      setShowErrors(true)
      return
    }

    const fields = {
      title: form.title.trim(),
      subjectId: form.subjectId === NO_SUBJECT ? undefined : form.subjectId,
      priority: form.priority,
      estimateMinutes: normalizeEstimate(Number(form.estimate)),
      deadline: form.date ? { date: form.date, at: form.time } : undefined,
      notes: form.notes.trim() || undefined,
    }

    if (task) {
      updateTask(task.id, fields)
    } else {
      addTask({
        id: createId('task'),
        status: 'open',
        createdAt: new Date().toISOString(),
        ...fields,
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-hand text-xl font-normal">
            {task ? 'Edit task' : 'New task'}
          </DialogTitle>
          <DialogDescription>
            How much work is it, and when is it due? The estimate is what lets
            the app find you a slot.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="Lab report draft"
              aria-invalid={showErrors && titleMissing}
              autoFocus
            />
            {showErrors && titleMissing ? (
              <p className="text-[0.72rem] text-rose-pen">
                Give it a name so you can find it later.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-subject">Subject</Label>
              <Select
                value={form.subjectId}
                onValueChange={(value) => set('subjectId', value)}
              >
                <SelectTrigger id="task-subject" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUBJECT}>No subject</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => set('priority', value as Priority)}
              >
                <SelectTrigger id="task-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_0.8fr] gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-date">Due date</Label>
              <DateField
                id="task-date"
                value={form.date}
                onChange={(value) => set('date', value)}
                placeholder="None"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-time">Time</Label>
              <TimeField
                id="task-time"
                value={form.time}
                onChange={(minute) => set('time', minute)}
                format={timeFormat}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-estimate">Minutes</Label>
              <Input
                id="task-estimate"
                type="number"
                min={1}
                step={1}
                value={form.estimate}
                onChange={(event) => set('estimate', event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={form.notes}
              onChange={(event) => set('notes', event.target.value)}
              rows={2}
              placeholder="Anything you will forget otherwise"
            />
          </div>

          <DialogFooter className="mt-1">
            {task ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mr-auto font-hand"
                onClick={() => {
                  run('Task deleted', () => deleteTask(task.id))
                  onOpenChange(false)
                }}
              >
                Delete
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="font-hand"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="font-hand">
              {task ? 'Save' : 'Add task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
