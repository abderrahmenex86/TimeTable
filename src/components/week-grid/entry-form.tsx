import { useEffect, useState } from 'react'
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
import { parseClock } from '@/domain/time'
import {
  SUBJECT_COLORS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  type Subject,
  type SubjectColor,
  type TimetableEntry,
  type WeekParity,
  type Weekday,
} from '@/domain/types'
import { createId } from '@/lib/id'
import { cn } from '@/lib/utils'
import { useTimetable } from '@/store/timetable-store'

const NEW_SUBJECT = '__new__'

const PARITIES: Array<{ value: WeekParity; label: string }> = [
  { value: 'all', label: 'Every week' },
  { value: 'odd', label: 'Odd weeks' },
  { value: 'even', label: 'Even weeks' },
]

type FormState = {
  title: string
  subjectId: string
  location: string
  days: Weekday[]
  start: string
  end: string
  parity: WeekParity
  newSubjectName: string
  newSubjectColor: SubjectColor
}

function initialState(entry: TimetableEntry | null): FormState {
  return {
    title: entry?.title ?? '',
    subjectId: entry?.subjectId ?? '',
    location: entry?.location ?? '',
    days: entry ? [...entry.recurrence.days] : [],
    start: minuteToInput(entry?.recurrence.start ?? 9 * 60),
    end: minuteToInput(entry?.recurrence.end ?? 10 * 60 + 30),
    parity: entry?.recurrence.parity ?? 'all',
    newSubjectName: '',
    newSubjectColor: 'sky',
  }
}

function minuteToInput(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(
    minute % 60,
  ).padStart(2, '0')}`
}

type EntryFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` creates a new entry. */
  entry: TimetableEntry | null
  subjects: Subject[]
}

export function EntryForm({ open, onOpenChange, entry, subjects }: EntryFormProps) {
  const addEntry = useTimetable((state) => state.addEntry)
  const updateEntry = useTimetable((state) => state.updateEntry)
  const deleteEntry = useTimetable((state) => state.deleteEntry)
  const addSubject = useTimetable((state) => state.addSubject)

  const [form, setForm] = useState<FormState>(() => initialState(entry))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(initialState(entry))
    setError(null)
  }, [open, entry])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  function toggleDay(day: Weekday) {
    setForm((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((candidate) => candidate !== day)
        : [...current.days, day].sort(),
    }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const start = parseClock(form.start)
    const end = parseClock(form.end)

    if (!form.title.trim()) return setError('Give the session a name.')
    if (!form.subjectId) return setError('Pick a subject.')
    if (form.subjectId === NEW_SUBJECT && !form.newSubjectName.trim()) {
      return setError('Name the new subject.')
    }
    if (form.days.length === 0) return setError('Pick at least one day.')
    if (start === null || end === null) return setError('Check the start and end times.')
    if (end <= start) return setError('The end time has to be after the start.')

    let subjectId = form.subjectId
    if (subjectId === NEW_SUBJECT) {
      const subject: Subject = {
        id: createId('sub'),
        name: form.newSubjectName.trim(),
        color: form.newSubjectColor,
      }
      addSubject(subject)
      subjectId = subject.id
    }

    const recurrence = {
      days: form.days,
      start,
      end,
      parity: form.parity,
    }

    if (entry) {
      updateEntry(entry.id, {
        title: form.title.trim(),
        subjectId,
        location: form.location.trim() || undefined,
        recurrence,
      })
    } else {
      addEntry({
        id: createId('ent'),
        subjectId,
        title: form.title.trim(),
        location: form.location.trim() || undefined,
        recurrence,
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-hand text-xl font-normal">
            {entry ? 'Edit session' : 'New session'}
          </DialogTitle>
          <DialogDescription>
            Sessions repeat. Set the days and times once and every week of the
            term follows.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry-title">Title</Label>
            <Input
              id="entry-title"
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="Linear Algebra"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-subject">Subject</Label>
              <Select
                value={form.subjectId}
                onValueChange={(value) => set('subjectId', value)}
              >
                <SelectTrigger id="entry-subject" className="w-full">
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_SUBJECT}>New subject…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-location">Location</Label>
              <Input
                id="entry-location"
                value={form.location}
                onChange={(event) => set('location', event.target.value)}
                placeholder="Room B3"
              />
            </div>
          </div>

          {form.subjectId === NEW_SUBJECT ? (
            <div className="sketch-sm flex flex-col gap-2 bg-paper-sunk/60 p-2.5">
              <Label htmlFor="entry-new-subject">New subject</Label>
              <Input
                id="entry-new-subject"
                value={form.newSubjectName}
                onChange={(event) => set('newSubjectName', event.target.value)}
                placeholder="Organic Chemistry"
              />
              <div className="flex items-center gap-1.5">
                {SUBJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    aria-pressed={form.newSubjectColor === color}
                    onClick={() => set('newSubjectColor', color)}
                    className={cn(
                      'size-6 rounded-full border-2 transition-transform',
                      form.newSubjectColor === color
                        ? 'scale-110 border-ink'
                        : 'border-transparent',
                    )}
                    style={{ backgroundColor: `var(--color-${color}-fill)` }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label>Days</Label>
            <div className="flex gap-1">
              {WEEKDAYS.map((day) => {
                const active = form.days.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'h-8 flex-1 border text-[0.68rem] transition-colors',
                      active
                        ? 'border-sky-pen bg-sky-fill text-sky-pen'
                        : 'border-rule bg-paper-raised text-ink-60 hover:border-ink-30',
                    )}
                    style={{ borderRadius: '7px 2px 8px 3px / 3px 8px 2px 7px' }}
                  >
                    {WEEKDAY_LABELS[day]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-start">Start</Label>
              <Input
                id="entry-start"
                type="time"
                value={form.start}
                onChange={(event) => set('start', event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-end">End</Label>
              <Input
                id="entry-end"
                type="time"
                value={form.end}
                onChange={(event) => set('end', event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-parity">Repeats</Label>
              <Select
                value={form.parity}
                onValueChange={(value) => set('parity', value as WeekParity)}
              >
                <SelectTrigger id="entry-parity" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARITIES.map((parity) => (
                    <SelectItem key={parity.value} value={parity.value}>
                      {parity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? (
            <p className="text-[0.72rem] text-rose-pen" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="mt-1">
            {entry ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mr-auto font-hand"
                onClick={() => {
                  deleteEntry(entry.id)
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
              {entry ? 'Save' : 'Add session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
