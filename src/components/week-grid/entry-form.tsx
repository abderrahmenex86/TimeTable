import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import { TimeField } from '@/components/fields/time-field'
import { addDays, dateKeyToDate, dateToDateKey } from '@/domain/dates'
import {
  SUBJECT_COLORS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  type Recurrence,
  type Subject,
  type SubjectColor,
  type TimetableEntry,
  type WeekParity,
  type Weekday,
} from '@/domain/types'
import { createId } from '@/lib/id'
import { cn } from '@/lib/utils'
import { useTimetable } from '@/store/timetable-store'
import { useUndoable } from '@/store/undo'

const NEW_SUBJECT = '__new__'

/** The repeat choices surfaced in the form. `never` maps to dated sessions. */
type RepeatChoice = WeekParity | 'never'

const REPEAT_OPTIONS: Array<{ value: RepeatChoice; label: string }> = [
  { value: 'all', label: 'Every week' },
  { value: 'odd', label: 'Odd weeks' },
  { value: 'even', label: 'Even weeks' },
  { value: 'never', label: 'Never' },
]

type FormState = {
  title: string
  subjectId: string
  location: string
  repeat: RepeatChoice
  /** Only meaningful when `repeat` is `never`. */
  dates: string[]
  days: Weekday[]
  start: number
  end: number
  newSubjectName: string
  newSubjectColor: SubjectColor
}

function initialState(entry: TimetableEntry | null): FormState {
  const recurrence = entry?.recurrence
  const isDated = recurrence?.kind === 'dated'

  return {
    title: entry?.title ?? '',
    subjectId: entry?.subjectId ?? '',
    location: entry?.location ?? '',
    repeat: isDated
      ? 'never'
      : recurrence?.kind === 'weekly'
        ? recurrence.parity
        : 'all',
    dates: isDated ? [...recurrence.dates] : [],
    days: recurrence?.kind === 'weekly' ? [...recurrence.days] : [],
    start: recurrence?.start ?? 9 * 60,
    end: recurrence?.end ?? 10 * 60 + 30,
    newSubjectName: '',
    newSubjectColor: 'sky',
  }
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
  const term = useTimetable((state) => state.term)
  const run = useUndoable()

  const [form, setForm] = useState<FormState>(() => initialState(entry))
  const [error, setError] = useState<string | null>(null)

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

    const isNever = form.repeat === 'never'

    if (!form.title.trim()) return setError('Give the session a name.')
    if (!form.subjectId) return setError('Pick a subject.')
    if (form.subjectId === NEW_SUBJECT && !form.newSubjectName.trim()) {
      return setError('Name the new subject.')
    }
    if (isNever && form.dates.length === 0) {
      return setError('Pick at least one date, or choose a repeat.')
    }
    if (!isNever && form.days.length === 0) {
      return setError('Pick at least one day, or set it to never repeat.')
    }
    if (form.end <= form.start) {
      return setError('The end time has to be after the start.')
    }

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

    const recurrence: Recurrence = isNever
      ? { kind: 'dated', dates: [...form.dates].sort(), start: form.start, end: form.end }
      : {
          kind: 'weekly',
          days: form.days,
          start: form.start,
          end: form.end,
          // `never` is handled above, so this is a plain parity value.
          parity: form.repeat === 'never' ? 'all' : form.repeat,
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

  const isNever = form.repeat === 'never'
  const termStart = dateKeyToDate(term.startDate)
  const termEnd = dateKeyToDate(
    addDays(term.startDate, term.weekCount * 7 - 1),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-hand text-xl font-normal">
            {entry ? 'Edit session' : 'New session'}
          </DialogTitle>
          <DialogDescription>
            Sessions can repeat across the term, or happen on specific dates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="dialog-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
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
                      style={{ backgroundColor: `var(--${color}-fill)` }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-start">Start</Label>
                <TimeField
                  id="entry-start"
                  value={form.start}
                  onChange={(minute) => set('start', minute)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-end">End</Label>
                <TimeField
                  id="entry-end"
                  value={form.end}
                  onChange={(minute) => set('end', minute)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-repeat">Repeats</Label>
                <Select
                  value={form.repeat}
                  onValueChange={(value) => set('repeat', value as RepeatChoice)}
                >
                  <SelectTrigger id="entry-repeat" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPEAT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isNever ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <Label>Dates</Label>
                  <span className="text-[0.7rem] text-ink-40" data-num>
                    {form.dates.length === 0
                      ? 'none selected'
                      : `${form.dates.length} selected`}
                  </span>
                </div>
                <div className="flex justify-center rounded-lg border border-rule bg-paper-sunk/40 p-1">
                  <Calendar
                    mode="multiple"
                    selected={form.dates.map(dateKeyToDate)}
                    onSelect={(dates) =>
                      set(
                        'dates',
                        (dates ?? []).map(dateToDateKey).sort(),
                      )
                    }
                    disabled={{ before: termStart, after: termEnd }}
                    startMonth={termStart}
                    endMonth={termEnd}
                  />
                </div>
              </div>
            ) : (
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
                          'h-8 flex-1 border-[1.5px] font-hand text-[0.72rem] transition-colors',
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
            )}

            {error ? (
              <p className="text-[0.72rem] text-rose-pen" role="alert">
                {error}
              </p>
            ) : null}

          </div>

          <DialogFooter className="mt-1">
            {entry ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="mr-auto font-hand"
                onClick={() => {
                  run('Session deleted', () => deleteEntry(entry.id))
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
